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

# GitHub raw URL template
_RAW_URL = "https://raw.githubusercontent.com/{repo}/{branch}/{path}"
_NFI_REPO = os.getenv("NFI_REPO", "iterativv/NostalgiaForInfinity")
_NFI_BRANCH = "main"


def _load_symbol_map() -> dict[str, dict]:
    if _SYMBOL_MAP_PATH.exists():
        return json.loads(_SYMBOL_MAP_PATH.read_text())
    return {}


@cached("github_blob")
async def _fetch_blacklist(url: str) -> str:
    async with aiohttp.ClientSession() as session:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as resp:
            resp.raise_for_status()
            return await resp.text()


def _parse_blacklist(content: str) -> set[str]:
    """Extract token symbols from NFI blacklist python file or plain text."""
    symbols: set[str] = set()

    # Match quoted strings in blacklist arrays/sets
    for match in re.finditer(r'["\']([A-Z0-9]{2,12})["\']', content):
        sym = match.group(1)
        if sym.isupper() and len(sym) >= 2:
            symbols.add(sym)

    return symbols


async def nfi_blacklist_collector(bus) -> AsyncGenerator[None, None]:
    symbol_map = _load_symbol_map()
    blacklist_path = os.getenv("NFI_BLACKLIST_PATH", "")
    if not blacklist_path:
        log.warning("nfi_blacklist_path_not_set")
        return

    url = _RAW_URL.format(repo=_NFI_REPO, branch=_NFI_BRANCH, path=blacklist_path)
    known: set[str] = set()
    first_run = True

    while True:
        try:
            content = await _fetch_blacklist(url)
            current = _parse_blacklist(content)

            if first_run:
                known = current
                first_run = False
                log.info("nfi_baseline", count=len(known))
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
