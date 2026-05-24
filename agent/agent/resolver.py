from __future__ import annotations

import asyncio
import time

from agent import health as agent_health
from agent.chain import ChainClient
from agent.collectors.price_anomaly import get_price_usd
from agent.logging import get_logger

log = get_logger(__name__)

_POLL_INTERVAL = 600  # 10 minutes


async def resolver_loop(chain: ChainClient) -> None:
    while True:
        try:
            await _resolve_expired(chain)
        except Exception as exc:
            log.error("resolver_error", error=str(exc))
        await asyncio.sleep(_POLL_INTERVAL)


async def _resolve_expired(chain: ChainClient) -> None:
    markets: list[str] = await chain.call(
        chain.market_registry.functions.getMarkets().call
    )
    now = int(time.time())
    resolved = 0

    for addr in markets:
        try:
            contract = chain.binary_market_at(addr)
            resolves_at = await chain.call(contract.functions.resolvesAt().call)
            state_val = await chain.call(contract.functions.state().call)

            # state 0 = Open
            if state_val != 0:
                continue
            if now < resolves_at:
                continue

            # fetch current price
            token_id_raw: bytes = await chain.call(contract.functions.tokenId().call)
            token_chain: str = await chain.call(contract.functions.tokenChain().call)
            baseline: int = await chain.call(contract.functions.baselinePrice().call)
            threshold_bps: int = await chain.call(contract.functions.thresholdBps().call)

            token_id_str = _decode_token_id(token_id_raw, token_chain)
            current_price = await get_price_usd(token_id_str, token_chain)
            current_8dec = int(current_price * 10**8)

            drop_bps = int((baseline - current_8dec) * 10000 / baseline) if baseline > 0 else 0
            outcome_yes = drop_bps >= threshold_bps

            log.info(
                "resolving_market",
                address=addr,
                drop_bps=drop_bps,
                threshold=threshold_bps,
                yes=outcome_yes,
            )
            await chain.send_tx(contract.functions.resolve, outcome_yes)
            short = f"{addr[:10]}…{addr[-4:]}"
            outcome_str = "YES · token rugged" if outcome_yes else "NO · token survived"
            agent_health.record_event("resolve", f"market {short} · {outcome_str} · drop {drop_bps}bps")
            resolved += 1
        except Exception as exc:
            log.error("resolve_market_error", address=addr, error=str(exc))

    if resolved:
        log.info("resolver_resolved", count=resolved)


def _decode_token_id(raw: bytes, chain: str) -> str:
    if chain in ("bsc", "ethereum", "base"):
        return "0x" + raw[-20:].hex()
    return raw.rstrip(b"\x00").decode("utf-8", errors="replace")
