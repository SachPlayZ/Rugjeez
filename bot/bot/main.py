from __future__ import annotations

import asyncio
import logging
import os
import time
from contextlib import asynccontextmanager
from pathlib import Path

import structlog
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI
from web3 import AsyncWeb3

from bot.state import get_last_block, init_db, is_posted, mark_posted, set_last_block
from bot.telegram import post as tg_post
from bot.templates import format_market_created
from bot.trace import fetch_trace
from bot.watcher import backfill, watch

load_dotenv()

structlog.configure(
    processors=[
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(
        getattr(logging, os.environ.get("LOG_LEVEL", "INFO"))
    ),
)

log = structlog.get_logger()

ARC_WSS_URL = os.environ["ARC_WSS_URL"]
ARC_RPC_URL = os.environ.get("ARC_RPC_URL", "https://rpc.testnet.arc.network")
MARKET_REGISTRY_ADDRESS = os.environ["MARKET_REGISTRY_ADDRESS"]
TRACE_REGISTRY_ADDRESS = os.environ["TRACE_REGISTRY_ADDRESS"]
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")
WEB_BASE_URL = os.environ.get("WEB_BASE_URL", "https://rugjeez.xyz")
EXPLORER_URL = os.environ.get("EXPLORER_URL", "https://testnet.arcscan.app")
IPFS_GATEWAY = os.environ.get("IPFS_GATEWAY", "https://gateway.pinata.cloud/ipfs/")
DB_PATH = Path(os.environ.get("DB_PATH", "bot_state.db"))
HOST = os.environ.get("BOT_HOST", "0.0.0.0")
PORT = int(os.environ.get("BOT_PORT", "8788"))

_start_time = time.time()


async def _handle(event: dict, w3: AsyncWeb3) -> None:
    market = event["market"]
    bound = log.bind(market=market, symbol=event["token_symbol"], block=event["block_number"])

    if await is_posted(market, db_path=DB_PATH):
        bound.info("already_posted_skip")
        return

    trace = await fetch_trace(w3, TRACE_REGISTRY_ADDRESS, event["trace_hash"], IPFS_GATEWAY)

    msg = format_market_created(
        symbol=event["token_symbol"],
        chain=event["token_chain"],
        resolves_at=event["resolves_at"],
        market_address=market,
        tx_hash=event["tx_hash"],
        web_base_url=WEB_BASE_URL,
        explorer_url=EXPLORER_URL,
        trace=trace,
    )

    posted = False
    if TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID:
        for attempt in range(3):
            posted = await tg_post(TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, msg)
            if posted:
                break
            if attempt < 2:
                delay = 2**attempt  # 1 s, then 2 s
                bound.warning("telegram_retry", attempt=attempt + 1, retry_in_s=delay)
                await asyncio.sleep(delay)
        if not posted:
            bound.error(
                "telegram_post_failed_all_attempts",
                market=market,
                note="market will be retried on next bot restart via backfill",
            )
    else:
        bound.warning("telegram_not_configured_marking_handled")
        posted = True

    if posted:
        await mark_posted(market, db_path=DB_PATH)
        await set_last_block(event["block_number"], db_path=DB_PATH)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db(DB_PATH)
    w3 = AsyncWeb3(AsyncWeb3.AsyncHTTPProvider(ARC_RPC_URL))

    async def on_event(event: dict) -> None:
        await _handle(event, w3)

    last_block = await get_last_block(DB_PATH)
    if last_block > 0:
        latest = await backfill(w3, MARKET_REGISTRY_ADDRESS, last_block, on_event)
        await set_last_block(latest, DB_PATH)

    watcher_task = asyncio.create_task(
        watch(ARC_WSS_URL, MARKET_REGISTRY_ADDRESS, on_event)
    )

    log.info("bot_started", registry=MARKET_REGISTRY_ADDRESS, last_block=last_block)
    yield

    watcher_task.cancel()
    try:
        await watcher_task
    except asyncio.CancelledError:
        pass


app = FastAPI(lifespan=lifespan)


@app.get("/health")
async def health():
    return {"status": "ok", "uptime_s": round(time.time() - _start_time)}


def run() -> None:
    uvicorn.run("bot.main:app", host=HOST, port=PORT, log_config=None)


if __name__ == "__main__":
    run()
