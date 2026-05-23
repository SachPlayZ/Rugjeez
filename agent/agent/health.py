from __future__ import annotations

import time
from typing import Any

_start_time = int(time.time())
_state: dict[str, Any] = {
    "last_signal_seen_at": None,
    "last_market_minted_at": None,
    "last_market_address": None,
    "in_flight_mints": 0,
    "errors_last_hour": 0,
}
_error_times: list[int] = []


def record_signal() -> None:
    _state["last_signal_seen_at"] = _now_iso()


def record_mint(address: str) -> None:
    _state["last_market_minted_at"] = _now_iso()
    _state["last_market_address"] = address


def record_error() -> None:
    now = int(time.time())
    _error_times.append(now)
    cutoff = now - 3600
    while _error_times and _error_times[0] < cutoff:
        _error_times.pop(0)
    _state["errors_last_hour"] = len(_error_times)


def set_in_flight(n: int) -> None:
    _state["in_flight_mints"] = n


def snapshot() -> dict:
    return {
        "status": "ok",
        "uptime_seconds": int(time.time()) - _start_time,
        **_state,
    }


def _now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
