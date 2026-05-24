from __future__ import annotations

import asyncio
import json
import os
import time
from pathlib import Path
from typing import AsyncGenerator

import aiohttp

from agent import health as agent_health
from agent.logging import get_logger
from agent.models import Signal

log = get_logger(__name__)

_POLL_INTERVAL = 60  # seconds
_SYMBOL_MAP_PATH = Path(__file__).parent.parent / "data" / "symbol_map.json"
_BLACKLIST_URL = (
    "https://raw.githubusercontent.com/SachPlayZ/Rugjeez/main/configs/blacklist.json"
)


def _load_symbol_map() -> dict[str, dict]:
    if _SYMBOL_MAP_PATH.exists():
        return json.loads(_SYMBOL_MAP_PATH.read_text())
    return {}


def _gh_headers() -> dict[str, str]:
    token = os.getenv("GITHUB_TOKEN")
    headers: dict[str, str] = {"Cache-Control": "no-cache"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


async def _fetch_blacklist(session: aiohttp.ClientSession) -> list[str]:
    async with session.get(
        _BLACKLIST_URL,
        timeout=aiohttp.ClientTimeout(total=10),
        headers=_gh_headers(),
    ) as resp:
        resp.raise_for_status()
        data = json.loads(await resp.text())
        if not isinstance(data, list):
            raise ValueError(f"Expected list, got {type(data)}")
        return [str(s).upper().strip() for s in data if s]


async def rugjeez_blacklist_collector(bus) -> AsyncGenerator[None, None]:
    symbol_map = _load_symbol_map()
    known: set[str] = set()
    first_run = True

    async with aiohttp.ClientSession() as session:
        while True:
            try:
                current = set(await _fetch_blacklist(session))

                if first_run:
                    known = current
                    first_run = False
                    log.info("rugjeez_baseline", count=len(known), url=_BLACKLIST_URL)
                    agent_health.record_event("ok", f"rugjeez blacklist loaded · {len(known)} entries")
                else:
                    new_symbols = current - known
                    if new_symbols:
                        agent_health.record_event("flag", f"rugjeez · new entries: {', '.join(sorted(new_symbols)[:4])}")
                    else:
                        agent_health.record_event("scan", f"rugjeez check · {len(current)} entries · no new additions")
                    for sym in sorted(new_symbols):
                        log.info("rugjeez_new_entry", symbol=sym)

                        if sym not in symbol_map:
                            log.warning("rugjeez_symbol_not_mapped", symbol=sym)
                            known.add(sym)
                            continue

                        token_info = symbol_map[sym]
                        signal = Signal(
                            source="rugjeez_blacklist",
                            token_id=token_info["token_id"],
                            token_chain=token_info["chain"],
                            token_symbol=sym,
                            severity=0.95,  # slightly higher — manually curated
                            raw_data={
                                "blacklist_url": _BLACKLIST_URL,
                                "symbol": sym,
                            },
                            timestamp=int(time.time()),
                        )
                        await bus.publish(signal)
                        known.add(sym)

            except Exception as exc:
                log.error("rugjeez_collector_error", error=str(exc))
                agent_health.record_event("err", f"rugjeez fetch failed · {str(exc)[:60]}")

            await asyncio.sleep(_POLL_INTERVAL)
