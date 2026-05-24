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
    log.info("scored", signal_id=signal.id, score=round(score, 3))

    if score < THRESHOLD:
        return

    # clear bucket so we don't re-trigger
    _pending_signals[signal.token_id] = []

    try:
        health.set_in_flight(1)
        output = await reason(contributing, score, signal.id)

        if output.verdict != "open_market":
            log.info("verdict_no_market", signal_id=signal.id, verdict=output.verdict)
            return

        market_addr = await execute(contributing, output, chain)
        health.record_mint(market_addr)
        log.info("pipeline_complete", signal_id=signal.id, market=market_addr)
    except Exception as exc:
        health.record_error()
        log.error("pipeline_error", signal_id=signal.id, error=str(exc))
    finally:
        health.set_in_flight(0)


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

    bus = SignalBus()
    chain = ChainClient()

    # register demo routes and seed candidates
    app.include_router(make_router(bus))
    await load_candidates()

    collectors = [
        nfi_blacklist_collector(bus),
        price_anomaly_collector(bus),
    ]
    log.info("watching_collectors", count=len(collectors))

    tasks = [
        asyncio.create_task(_agent_loop(bus, chain)),
        asyncio.create_task(resolver_loop(chain)),
        asyncio.create_task(_run_uvicorn()),
    ]
    for collector in collectors:
        tasks.append(asyncio.create_task(collector))

    await asyncio.gather(*tasks)


if __name__ == "__main__":
    asyncio.run(main())
