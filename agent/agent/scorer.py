from __future__ import annotations

from agent.models import Signal

_WEIGHTS: dict[str, float] = {
    "nfi_blacklist": 0.5,
    "price_anomaly": 0.3,
    "solana_lp": 0.2,
    "manual_demo": 1.0,  # bypass threshold
}

THRESHOLD = 0.6


def score_token(signals: list[Signal]) -> tuple[float, list[Signal]]:
    """Return (weighted_score, contributing_signals). Score >= THRESHOLD triggers a market."""
    if not signals:
        return 0.0, []

    # manual_demo bypasses threshold immediately
    for sig in signals:
        if sig.source == "manual_demo":
            return 1.0, signals

    total_weight = 0.0
    weighted_score = 0.0
    contributing: list[Signal] = []

    for sig in signals:
        w = _WEIGHTS.get(sig.source, 0.1)
        contribution = w * sig.severity
        if contribution > 0:
            contributing.append(sig)
        weighted_score += contribution
        total_weight += w

    score = weighted_score / total_weight if total_weight > 0 else 0.0
    return score, contributing
