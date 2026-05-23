from __future__ import annotations

import time

import pytest

from agent.models import Signal
from agent.scorer import THRESHOLD, score_token


def _sig(source: str, severity: float) -> Signal:
    return Signal(
        source=source,
        token_id="0xabc",
        token_chain="bsc",
        token_symbol="TEST",
        severity=severity,
        raw_data={},
        timestamp=int(time.time()),
    )


def test_empty_signals():
    score, contrib = score_token([])
    assert score == 0.0
    assert contrib == []


def test_nfi_alone_high_severity_triggers():
    score, contrib = score_token([_sig("nfi_blacklist", 0.9)])
    # weight 0.5 * 0.9 / 0.5 = 0.9 >= THRESHOLD
    assert score >= THRESHOLD
    assert len(contrib) == 1


def test_nfi_alone_low_severity_no_trigger():
    score, _ = score_token([_sig("nfi_blacklist", 0.1)])
    # 0.5 * 0.1 / 0.5 = 0.1 < 0.6
    assert score < THRESHOLD


def test_combined_nfi_price_anomaly_triggers():
    sigs = [_sig("nfi_blacklist", 0.6), _sig("price_anomaly", 0.8)]
    score, contrib = score_token(sigs)
    assert score >= THRESHOLD
    assert len(contrib) == 2


def test_manual_demo_always_triggers():
    sigs = [_sig("manual_demo", 0.01)]
    score, contrib = score_token(sigs)
    assert score == 1.0
    assert len(contrib) == 1


def test_unknown_source_low_weight():
    sigs = [_sig("unknown_source", 0.5)]
    score, _ = score_token(sigs)
    # unknown weight 0.1 * 0.5 / 0.1 = 0.5 < THRESHOLD
    assert score < THRESHOLD
