from __future__ import annotations

import time
from pathlib import Path

import aiosqlite

_DEFAULT = Path("bot_state.db")


async def init_db(db_path: Path = _DEFAULT) -> None:
    async with aiosqlite.connect(db_path) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS posted_markets (
                market_address TEXT PRIMARY KEY,
                posted_at      INTEGER NOT NULL
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS cursor (
                id         INTEGER PRIMARY KEY CHECK (id = 1),
                last_block INTEGER NOT NULL
            )
        """)
        await db.execute("INSERT OR IGNORE INTO cursor (id, last_block) VALUES (1, 0)")
        await db.commit()


async def is_posted(market: str, db_path: Path = _DEFAULT) -> bool:
    async with aiosqlite.connect(db_path) as db:
        async with db.execute(
            "SELECT 1 FROM posted_markets WHERE market_address = ?", (market.lower(),)
        ) as cur:
            return await cur.fetchone() is not None


async def mark_posted(market: str, db_path: Path = _DEFAULT) -> None:
    async with aiosqlite.connect(db_path) as db:
        await db.execute(
            "INSERT OR IGNORE INTO posted_markets (market_address, posted_at) VALUES (?, ?)",
            (market.lower(), int(time.time())),
        )
        await db.commit()


async def get_last_block(db_path: Path = _DEFAULT) -> int:
    async with aiosqlite.connect(db_path) as db:
        async with db.execute("SELECT last_block FROM cursor WHERE id = 1") as cur:
            row = await cur.fetchone()
            return row[0] if row else 0


async def set_last_block(block: int, db_path: Path = _DEFAULT) -> None:
    async with aiosqlite.connect(db_path) as db:
        await db.execute(
            "INSERT OR REPLACE INTO cursor (id, last_block) VALUES (1, ?)", (block,)
        )
        await db.commit()
