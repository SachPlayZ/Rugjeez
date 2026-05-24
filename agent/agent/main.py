from __future__ import annotations

import asyncio
import os

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from agent import health, state
from agent.bus import SignalBus
from agent.chain import ChainClient
from agent.collectors.nfi_blacklist import nfi_blacklist_collector
from agent.collectors.price_anomaly import add_to_watchlist, price_anomaly_collector
from agent.collectors.rugjeez_blacklist import rugjeez_blacklist_collector
from agent.demo_api import load_candidates, make_router
from agent.executor import execute
from agent.logging import configure_logging, get_logger
from agent.models import Signal
from agent.reasoner import reason
from agent.resolver import resolver_loop
from agent.scorer import THRESHOLD, score_token

load_dotenv()
configure_logging()

log = get_logger(__name__)

_CORS_ORIGIN = os.getenv("CORS_ORIGIN", "*")

# FastAPI app — serves /health and /demo-<secret> endpoints
app = FastAPI(title="Rugjeez Agent")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[_CORS_ORIGIN] if _CORS_ORIGIN != "*" else ["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/health")
async def get_health():
    return health.snapshot()


# aggregated signals per token: token_id → list[Signal]
_pending_signals: dict[str, list[Signal]] = {}


async def _handle_signal(signal: Signal, chain: ChainClient) -> None:
    health.record_signal()
    log.info("signal_received", signal_id=signal.id, source=signal.source, token=signal.token_symbol)

    # add to price watchlist so price_anomaly tracks it from now on
    add_to_watchlist(signal.token_id, signal.token_chain, signal.token_symbol)

    bucket = _pending_signals.setdefault(signal.token_id, [])
    bucket.append(signal)

    score, contributing = score_token(bucket)
    score_pct = int(score * 100)
    log.info("scored", signal_id=signal.id, score=round(score, 3))

    if score < THRESHOLD:
        health.record_event(
            "scan",
            f"${signal.token_symbol} · score {score_pct} · from {signal.source} · below threshold",
        )
        return

    health.record_event(
        "flag",
        f"${signal.token_symbol} · score {score_pct} · threshold crossed · minting market…",
    )

    # clear bucket so we don't re-trigger
    _pending_signals[signal.token_id] = []

    try:
        health.set_in_flight(1)
        output = await reason(contributing, score, signal.id)

        if output.verdict != "open_market":
            health.record_event("scan", f"${signal.token_symbol} · verdict={output.verdict} · no market")
            log.info("verdict_no_market", signal_id=signal.id, verdict=output.verdict)
            return

        market_addr = await execute(contributing, output, chain)
        health.record_mint(market_addr)
        short = f"{market_addr[:10]}…{market_addr[-4:]}"
        health.record_event("mint", f"market deployed → {short} · ${signal.token_symbol}")
        log.info("pipeline_complete", signal_id=signal.id, market=market_addr)
    except Exception as exc:
        health.record_error()
        health.record_event("err", f"pipeline error · {str(exc)[:60]}")
        log.error("pipeline_error", signal_id=signal.id, error=str(exc))
    finally:
        health.set_in_flight(0)


async def _heartbeat_loop() -> None:
    await asyncio.sleep(5)  # let startup events land first
    while True:
        snap = health.snapshot()
        uptime = snap["uptime_seconds"]
        h, m = divmod(uptime // 60, 60)
        uptime_str = f"{h}h {m}m" if h else f"{m}m {uptime % 60}s"
        errors = snap.get("errors_last_hour", 0)
        in_flight = snap.get("in_flight_mints", 0)
        parts = [f"uptime {uptime_str}", f"{errors} errors/h"]
        if in_flight:
            parts.append(f"{in_flight} mint in-flight")
        health.record_event("ok", "heartbeat · " + " · ".join(parts))
        await asyncio.sleep(30)


async def _agent_loop(bus: SignalBus, chain: ChainClient) -> None:
    log.info("agent_loop_started")
    async for signal in bus.consume():
        asyncio.create_task(_handle_signal(signal, chain))


async def _run_uvicorn() -> None:
    port = int(os.getenv("DEMO_API_PORT", "8787"))
    host = os.getenv("DEMO_API_HOST", "127.0.0.1")
    config = uvicorn.Config(app, host=host, port=port, log_level="warning")
    server = uvicorn.Server(config)
    await server.serve()


async def main() -> None:
    await state.init_db()
    await state.reconcile()

    health.record_event("ok", "agent starting · db ready · collectors initialising")

    bus = SignalBus()
    chain = ChainClient()

    # register demo routes and seed candidates
    app.include_router(make_router(bus))
    await load_candidates()

    collectors = [
        nfi_blacklist_collector(bus),
        price_anomaly_collector(bus),
        rugjeez_blacklist_collector(bus),
    ]
    log.info("watching_collectors", count=len(collectors))
    health.record_event("ok", f"agent ready · {len(collectors)} collectors active · threshold {THRESHOLD}")

    tasks = [
        asyncio.create_task(_agent_loop(bus, chain)),
        asyncio.create_task(resolver_loop(chain)),
        asyncio.create_task(_run_uvicorn()),
        asyncio.create_task(_heartbeat_loop()),
    ]
    for collector in collectors:
        tasks.append(asyncio.create_task(collector))

    await asyncio.gather(*tasks)


if __name__ == "__main__":
    asyncio.run(main())
