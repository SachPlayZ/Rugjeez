from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from typing import Any


@dataclass
class Signal:
    source: str  # "nfi_blacklist" | "price_anomaly" | "manual_demo"
    token_id: str  # hex address or base58 string
    token_chain: str  # "solana" | "bsc" | "ethereum" | "base"
    token_symbol: str
    severity: float  # 0.0 to 1.0
    raw_data: dict[str, Any]
    timestamp: int  # unix seconds
    id: str = field(default_factory=lambda: str(uuid.uuid4()))


@dataclass
class ReasonerOutput:
    verdict: str  # "open_market" | "monitor" | "ignore"
    confidence: float
    rationale: str
    market_params: dict[str, Any]
    evidence_summary: list[dict[str, Any]]
    signal_id: str
