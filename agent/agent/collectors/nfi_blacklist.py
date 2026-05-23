from __future__ import annotations

import asyncio
import json
import os
import re
import time
from pathlib import Path
from typing import AsyncGenerator

import aiohttp

from agent.cache import cached
from agent.logging import get_logger
from agent.models import Signal

log = get_logger(__name__)

_POLL_INTERVAL = 60  # seconds
_SYMBOL_MAP_PATH = Path(__file__).parent.parent / "data" / "symbol_map.json"

_RAW_URL = "https://raw.githubusercontent.com/{repo}/{branch}/{path}"
_NFI_REPO = os.getenv("NFI_REPO", "iterativv/NostalgiaForInfinity")
_NFI_BRANCH = "main"
_NFI_BLACKLIST_PATH = os.getenv("NFI_BLACKLIST_PATH", "configs/blacklist-binance.json")


def _load_symbol_map() -> dict[str, dict]:
    if _SYMBOL_MAP_PATH.exists():
        return json.loads(_SYMBOL_MAP_PATH.read_text())
    return {}


@cached("github_blob")
async def _fetch_raw(url: str) -> str:
    async with aiohttp.ClientSession() as session:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as resp:
            resp.raise_for_status()
            return await resp.text()


def _parse_blacklist(content: str) -> set[str]:
    """Extract token symbols from NFI FreqTrade-style JSON blacklist.

    Entries look like: "(TOKENX|TOKENY|...)/.*"
    Strip comments (// ...) before parsing JSON.
    """
    cleaned = re.sub(r"//[^\n]*", "", content)
    try:
        data = json.loads(cleaned)
        pairs: list[str] = data.get("exchange", {}).get("pair_blacklist", [])
    except Exception:
        pairs = re.findall(r'"([^"]+)"', content)

    symbols: set[str] = set()
    for pattern in pairs:
        # grab everything inside the leading (...)/
        m = re.match(r"\(([^)]+)\)/", pattern)
        if not m:
            continue
        for raw_sym in m.group(1).split("|"):
            # skip regex tokens: .* [xxx] 1000.*
            sym = raw_sym.strip()
            if re.match(r"^[A-Z0-9]{2,20}$", sym):
                symbols.add(sym)
    return symbols


async def nfi_blacklist_collector(bus) -> AsyncGenerator[None, None]:
    symbol_map = _load_symbol_map()
    url = _RAW_URL.format(repo=_NFI_REPO, branch=_NFI_BRANCH, path=_NFI_BLACKLIST_PATH)
    known: set[str] = set()
    first_run = True

    while True:
        try:
            content = await _fetch_raw(url)
            current = _parse_blacklist(content)

            if first_run:
                known = current
                first_run = False
                log.info("nfi_baseline", count=len(known), url=url)
            else:
                new_symbols = current - known
                for sym in new_symbols:
                    log.info("nfi_new_entry", symbol=sym)
                    if sym not in symbol_map:
                        log.warning("nfi_symbol_not_mapped", symbol=sym)
                        known.add(sym)
                        continue

                    token_info = symbol_map[sym]
                    signal = Signal(
                        source="nfi_blacklist",
                        token_id=token_info["token_id"],
                        token_chain=token_info["chain"],
                        token_symbol=sym,
                        severity=0.9,
                        raw_data={
                            "blacklist_url": url,
                            "symbol": sym,
                        },
                        timestamp=int(time.time()),
                    )
                    await bus.publish(signal)
                    known.add(sym)

        except Exception as exc:
            log.error("nfi_collector_error", error=str(exc))

        await asyncio.sleep(_POLL_INTERVAL)
