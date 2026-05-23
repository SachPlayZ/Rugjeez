from __future__ import annotations

import os
import time

from cachetools import TTLCache
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from agent.bus import SignalBus
from agent.demo_loader import refresh_candidates
from agent.logging import get_logger
from agent.models import Signal

log = get_logger(__name__)

_SECRET = os.getenv("DEMO_API_SECRET", "x9k2vp4z")

# 10 mints per IP per hour; TTLCache resets window on last write
_rate_cache: TTLCache = TTLCache(maxsize=1000, ttl=3600)

_bus: SignalBus | None = None
_candidates: list[dict] = []


class InjectBody(BaseModel):
    candidate_id: str


def make_router(bus: SignalBus) -> APIRouter:
    global _bus
    _bus = bus

    router = APIRouter(prefix=f"/demo-{_SECRET}", tags=["demo"])

    @router.get("/candidates")
    async def get_candidates() -> dict:
        return {"candidates": _candidates}

    @router.post("/inject")
    async def inject_signal(body: InjectBody, request: Request) -> dict:
        ip = request.client.host if request.client else "unknown"

        count: int = _rate_cache.get(ip, 0)
        if count >= 10:
            raise HTTPException(status_code=429, detail="Rate limit: 10 injects/IP/hour")
        _rate_cache[ip] = count + 1

        candidate = next((c for c in _candidates if c["id"] == body.candidate_id), None)
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")

        if _bus is None:
            raise HTTPException(status_code=503, detail="Bus not initialised")

        signal = Signal(
            source="manual_demo",
            token_id=candidate["token_id"],
            token_chain=candidate["chain"],
            token_symbol=candidate["symbol"],
            severity=1.0,
            raw_data={
                "manual_demo": True,
                "added_in_commit": candidate["added_in_commit"],
                "commit_url": candidate["commit_url"],
                "summary": candidate["summary"],
            },
            timestamp=int(time.time()),
        )

        log.info(
            "demo_inject",
            signal_id=signal.id,
            symbol=candidate["symbol"],
            ip=ip,
            rate_count=count + 1,
        )

        await _bus.publish(signal)
        return {"signal_id": signal.id, "status": "injected", "symbol": candidate["symbol"]}

    return router


async def load_candidates() -> None:
    global _candidates
    try:
        _candidates = await refresh_candidates()
        log.info("demo_candidates_loaded", count=len(_candidates))
    except Exception as exc:
        log.error("demo_candidates_load_error", error=str(exc))
