from __future__ import annotations

from agent.reasoner import canonicalize, trace_hash


def test_canonical_deterministic():
    obj = {"b": 2, "a": 1, "c": {"z": 9, "y": 8}}
    assert canonicalize(obj) == canonicalize(obj)


def test_canonical_sorted_keys():
    a = {"x": 1, "a": 2}
    b = {"a": 2, "x": 1}
    assert canonicalize(a) == canonicalize(b)


def test_canonical_no_whitespace():
    result = canonicalize({"k": "v"})
    assert b" " not in result


def test_trace_hash_prefix():
    h = trace_hash({"signal_id": "abc"})
    assert h.startswith("0x")
    assert len(h) == 66  # 0x + 64 hex chars


def test_trace_hash_deterministic():
    obj = {"signal_id": "abc", "verdict": "open_market"}
    assert trace_hash(obj) == trace_hash(obj)


def test_trace_hash_different_on_change():
    h1 = trace_hash({"verdict": "open_market"})
    h2 = trace_hash({"verdict": "ignore"})
    assert h1 != h2
