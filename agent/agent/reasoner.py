from __future__ import annotations

import hashlib
import json
import os

from groq import AsyncGroq

from agent.logging import get_logger
from agent.models import ReasonerOutput, Signal

log = get_logger(__name__)

_DEFAULT_MODEL = "qwen/qwen3-32b"

_SYSTEM = """You are Rugjeez's risk analyst. Given a set of signals about a token,
decide whether to open a prediction market betting on whether the token will lose >50%
in 7 days. Return ONLY valid JSON matching this exact schema:

{
  "verdict": "open_market" | "monitor" | "ignore",
  "confidence": 0.0-1.0,
  "rationale": "one paragraph explaining your reasoning",
  "market_params": {
    "threshold_bps": 5000,
    "duration_hours": 168,
    "initial_liquidity_usdc": 2
  },
  "evidence_summary": [
    {"source": "...", "summary": "...", "weight": 0.0-1.0}
  ]
}

Open a market when evidence strongly suggests rug risk (confidence > 0.6).
Be factual and cite the signal sources. Do not hedge beyond what the data supports."""


def _build_prompt(signals: list[Signal], score: float) -> str:
    signal_block = json.dumps(
        [
            {
                "source": s.source,
                "token_symbol": s.token_symbol,
                "token_chain": s.token_chain,
                "severity": s.severity,
                "raw_data": s.raw_data,
            }
            for s in signals
        ],
        indent=2,
    )
    return f"Aggregate score: {score:.2f}\n\nSignals:\n{signal_block}"


def canonicalize(obj: dict) -> bytes:
    """Sorted-key, no-whitespace JSON bytes for deterministic hashing."""
    return json.dumps(obj, sort_keys=True, separators=(",", ":")).encode()


def trace_hash(trace: dict) -> str:
    return "0x" + hashlib.sha256(canonicalize(trace)).hexdigest()


async def reason(signals: list[Signal], score: float, signal_id: str) -> ReasonerOutput:
    client = AsyncGroq(api_key=os.environ["GROQ_API_KEY"])
    model = os.getenv("GROQ_MODEL", _DEFAULT_MODEL)

    log.info("reasoning_start", signal_id=signal_id, score=score, n_signals=len(signals), model=model)

    response = await client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": _SYSTEM},
            {"role": "user", "content": _build_prompt(signals, score)},
        ],
        response_format={"type": "json_object"},
        temperature=0.6,
        max_completion_tokens=4096,
        top_p=0.95,
        reasoning_effort="default",
        stream=False,
        stop=None,
    )

    raw = response.choices[0].message.content.strip()
    parsed = json.loads(raw)
    parsed["signal_id"] = signal_id

    log.info(
        "reasoning_complete",
        signal_id=signal_id,
        verdict=parsed["verdict"],
        confidence=parsed["confidence"],
    )

    return ReasonerOutput(
        verdict=parsed["verdict"],
        confidence=parsed["confidence"],
        rationale=parsed["rationale"],
        market_params=parsed["market_params"],
        evidence_summary=parsed["evidence_summary"],
        signal_id=signal_id,
    )
