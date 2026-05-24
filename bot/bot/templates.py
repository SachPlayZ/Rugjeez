from __future__ import annotations

import datetime

_SOURCE_LABELS: dict[str, str] = {
    "nfi_blacklist": "NFI blacklist",
    "price_anomaly": "price drop",
    "manual_demo": "demo inject",
}


def _signal_summary(signals: list[dict]) -> str:
    seen: list[str] = []
    for s in signals:
        label = _SOURCE_LABELS.get(s.get("source", ""), s.get("source", "unknown"))
        if label not in seen:
            seen.append(label)
        if len(seen) == 3:
            break
    return " · ".join(seen) or "unknown"


def _is_demo(signals: list[dict]) -> bool:
    return any(s.get("source") == "manual_demo" for s in signals)


def format_market_created(
    *,
    symbol: str,
    chain: str,
    resolves_at: int,
    market_address: str,
    tx_hash: str,
    web_base_url: str,
    explorer_url: str,
    trace: dict | None,
) -> str:
    confidence = f"{trace['confidence']:.2f}" if trace else "?"
    signals_text = _signal_summary(trace.get("signals", [])) if trace else "unknown"
    is_demo = _is_demo(trace.get("signals", [])) if trace else False

    resolves_dt = datetime.datetime.utcfromtimestamp(resolves_at)
    resolves_str = resolves_dt.strftime("%b %d %H:%M UTC")

    deep_link = f"{web_base_url.rstrip('/')}/market/{market_address}"
    trace_link = f"{explorer_url.rstrip('/')}/tx/{tx_hash}"
    demo_line = "\n🧪 demo mint" if is_demo else ""

    return (
        f"🚨 New rug market live{demo_line}\n\n"
        f"${symbol} on {chain}\n"
        f"Confidence: {confidence}/1.0\n"
        f"Signals: {signals_text}\n\n"
        f"Bet on it before {resolves_str}:\n"
        f"{deep_link}\n\n"
        f"Trace on-chain:\n"
        f"{trace_link}"
    )
