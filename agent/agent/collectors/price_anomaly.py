from __future__ import annotations

import asyncio
import time
from collections import defaultdict, deque
from typing import AsyncGenerator

import aiohttp

from agent import health as agent_health
from agent.cache import cached
from agent.logging import get_logger
from agent.models import Signal

log = get_logger(__name__)

_POLL_INTERVAL = 300  # 5 minutes
_DROP_THRESHOLD = 0.20  # 20% drop = signal
_WINDOW_SECONDS = 3600  # 1 hour


@cached("jupiter")
async def _fetch_jupiter(mint: str) -> float | None:
    url = f"https://price.jup.ag/v6/price?ids={mint}"
    async with aiohttp.ClientSession() as session:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as resp:
            if resp.status != 200:
                return None
            data = await resp.json()
            price_data = data.get("data", {}).get(mint)
            if price_data:
                return float(price_data["price"])
    return None


@cached("dexscreener")
async def _fetch_dexscreener(addr: str) -> float | None:
    url = f"https://api.dexscreener.com/latest/dex/tokens/{addr}"
    async with aiohttp.ClientSession() as session:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as resp:
            if resp.status != 200:
                return None
            data = await resp.json()
            pairs = data.get("pairs")
            if pairs:
                return float(pairs[0]["priceUsd"])
    return None


async def get_price_usd(token_id: str, chain: str) -> float:
    """Fetch current USD price. Raises on failure."""
    if chain == "solana":
        price = await _fetch_jupiter(token_id)
    else:
        price = await _fetch_dexscreener(token_id)
    if price is None:
        raise ValueError(f"price unavailable for {token_id} on {chain}")
    return price


class _PriceWindow:
    """Rolling window of (timestamp, price) pairs."""

    def __init__(self) -> None:
        self._data: deque[tuple[int, float]] = deque()

    def add(self, price: float) -> None:
        now = int(time.time())
        self._data.append((now, price))
        # drop old entries
        cutoff = now - _WINDOW_SECONDS
        while self._data and self._data[0][0] < cutoff:
            self._data.popleft()

    def max_drop_fraction(self) -> float:
        """Max drop from highest price to current price in window."""
        if len(self._data) < 2:
            return 0.0
        prices = [p for _, p in self._data]
        peak = max(prices[:-1])
        current = prices[-1]
        if peak <= 0:
            return 0.0
        return max(0.0, (peak - current) / peak)


# watchlist: token_id → (chain, symbol, PriceWindow)
_watchlist: dict[str, tuple[str, str, _PriceWindow]] = {}


def add_to_watchlist(token_id: str, chain: str, symbol: str) -> None:
    if token_id not in _watchlist:
        _watchlist[token_id] = (chain, symbol, _PriceWindow())


async def price_anomaly_collector(bus) -> None:
    while True:
        if not _watchlist:
            agent_health.record_event("scan", "price watchlist · 0 tokens · waiting for signals")
        for token_id, (chain, symbol, window) in list(_watchlist.items()):
            try:
                price = await get_price_usd(token_id, chain)
                window.add(price)
                drop = window.max_drop_fraction()
                drop_pct = f"{drop * 100:.1f}%"
                if drop >= _DROP_THRESHOLD:
                    severity = min(1.0, drop / 0.5)
                    agent_health.record_event("flag", f"price · ${symbol} ${price:.6g} · -{drop_pct} in 1h window · signalling")
                    log.info("price_anomaly_detected", symbol=symbol, drop=round(drop, 3))
                    signal = Signal(
                        source="price_anomaly",
                        token_id=token_id,
                        token_chain=chain,
                        token_symbol=symbol,
                        severity=severity,
                        raw_data={
                            "drop_fraction": round(drop, 4),
                            "price_usd": price,
                        },
                        timestamp=int(time.time()),
                    )
                    await bus.publish(signal)
                else:
                    agent_health.record_event("scan", f"price · ${symbol} ${price:.6g} · -{drop_pct} in 1h window · ok")
            except Exception as exc:
                log.warning("price_fetch_error", token=token_id, error=str(exc))
                agent_health.record_event("err", f"price fetch · ${symbol} · {str(exc)[:50]}")

        await asyncio.sleep(_POLL_INTERVAL)
