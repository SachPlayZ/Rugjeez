from __future__ import annotations

import os
import tempfile

import pytest

import agent.state as state_mod


@pytest.fixture(autouse=True)
def tmp_db(tmp_path, monkeypatch):
    db = str(tmp_path / "test.db")
    monkeypatch.setattr(state_mod, "DB_PATH", db)
    return db


async def test_create_and_get():
    await state_mod.init_db()
    await state_mod.create_mint("sig1", "0xabc")
    row = await state_mod.get_mint("sig1")
    assert row is not None
    assert row["status"] == state_mod.PENDING_IPFS
    assert row["token_id"] == "0xabc"


async def test_update_status():
    await state_mod.init_db()
    await state_mod.create_mint("sig2", "0xdef")
    await state_mod.update_mint("sig2", status=state_mod.PENDING_CHAIN, ipfs_cid="Qm123")
    row = await state_mod.get_mint("sig2")
    assert row["status"] == state_mod.PENDING_CHAIN
    assert row["ipfs_cid"] == "Qm123"


async def test_reconcile_marks_failed():
    await state_mod.init_db()
    await state_mod.create_mint("sig3", "0xghi")
    pending = await state_mod.get_pending_mints()
    assert len(pending) == 1

    await state_mod.reconcile()
    row = await state_mod.get_mint("sig3")
    assert row["status"] == state_mod.FAILED
    assert row["error"] == "agent_restart"


async def test_idempotent_create():
    await state_mod.init_db()
    await state_mod.create_mint("sig4", "0xjkl")
    await state_mod.create_mint("sig4", "0xjkl")  # second call should be no-op
    row = await state_mod.get_mint("sig4")
    assert row is not None
