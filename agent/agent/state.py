from __future__ import annotations

import time
from typing import Any

import aiosqlite

from agent.logging import get_logger

log = get_logger(__name__)

DB_PATH = "agent_state.db"

# status values
PENDING_IPFS = "pending_ipfs"
PENDING_CHAIN = "pending_chain"
PENDING_TRACE = "pending_trace"
COMPLETE = "complete"
FAILED = "failed"

SCHEMA = """
CREATE TABLE IF NOT EXISTS mints (
    signal_id TEXT PRIMARY KEY,
    token_id TEXT NOT NULL,
    status TEXT NOT NULL,
    ipfs_cid TEXT,
    market_address TEXT,
    create_tx_hash TEXT,
    trace_tx_hash TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    error TEXT
);
CREATE INDEX IF NOT EXISTS idx_mints_status ON mints(status);
"""


async def init_db() -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript(SCHEMA)
        await db.commit()


async def create_mint(signal_id: str, token_id: str) -> None:
    now = int(time.time())
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT OR IGNORE INTO mints (signal_id, token_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            (signal_id, token_id, PENDING_IPFS, now, now),
        )
        await db.commit()


async def update_mint(signal_id: str, **kwargs: Any) -> None:
    kwargs["updated_at"] = int(time.time())
    cols = ", ".join(f"{k} = ?" for k in kwargs)
    vals = list(kwargs.values()) + [signal_id]
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(f"UPDATE mints SET {cols} WHERE signal_id = ?", vals)
        await db.commit()


async def get_mint(signal_id: str) -> dict | None:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM mints WHERE signal_id = ?", (signal_id,)
        ) as cur:
            row = await cur.fetchone()
            return dict(row) if row else None


async def get_pending_mints() -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM mints WHERE status IN (?, ?, ?)",
            (PENDING_IPFS, PENDING_CHAIN, PENDING_TRACE),
        ) as cur:
            rows = await cur.fetchall()
            return [dict(r) for r in rows]


async def reconcile() -> None:
    """Mark stale in-flight rows as failed on startup (no mid-mint recovery for v1)."""
    pending = await get_pending_mints()
    for row in pending:
        log.warning("reconcile_failed_mint", signal_id=row["signal_id"], status=row["status"])
        await update_mint(row["signal_id"], status=FAILED, error="agent_restart")
