from __future__ import annotations

import asyncio
import time

from eth_account.messages import encode_defunct

from agent import state
from agent.chain import ChainClient
from agent.ipfs import pin_json
from agent.logging import get_logger
from agent.models import ReasonerOutput, Signal
from agent.reasoner import canonicalize, trace_hash

log = get_logger(__name__)

_USDC_DECIMALS = 6
_ZERO_ADDRESS = "0x" + "0" * 40


async def execute(
    signals: list[Signal],
    output: ReasonerOutput,
    chain: ChainClient,
) -> str:
    """Pin trace, mint market, record trace on-chain. Returns market address."""
    signal_id = output.signal_id
    primary = signals[0]

    # Reject placeholder token IDs before doing any expensive work.
    if primary.token_id.lower() == _ZERO_ADDRESS:
        raise ValueError(
            f"Refusing to mint: placeholder token_id for {primary.token_symbol}"
        )

    await state.create_mint(signal_id, primary.token_id)
    bound = log.bind(signal_id=signal_id, token=primary.token_symbol)

    # --- build trace object ---
    trace_obj = {
        "signal_id": signal_id,
        "token_id": primary.token_id,
        "token_symbol": primary.token_symbol,
        "token_chain": primary.token_chain,
        "verdict": output.verdict,
        "confidence": output.confidence,
        "rationale": output.rationale,
        "market_params": output.market_params,
        "evidence_summary": output.evidence_summary,
        "signals": [
            {
                "source": s.source,
                "severity": s.severity,
                "raw_data": s.raw_data,
                "timestamp": s.timestamp,
            }
            for s in signals
        ],
        "created_at": int(time.time()),
    }
    th = trace_hash(trace_obj)
    th_bytes = bytes.fromhex(th[2:])

    # sign hash with agent key
    msg = encode_defunct(hexstr=th)
    signed = chain.account.sign_message(msg)
    sig_hex = signed.signature.hex()

    # --- pin to IPFS ---
    bound.info("ipfs_pinning")
    await state.update_mint(signal_id, status=state.PENDING_IPFS)
    cid = await pin_json(trace_obj)
    await state.update_mint(signal_id, status=state.PENDING_CHAIN, ipfs_cid=cid)
    bound.info("ipfs_pinned", cid=cid)

    # --- fetch baseline price ---
    baseline_price = await _get_baseline_price(primary, chain)
    params = output.market_params
    duration_secs = int(params.get("duration_hours", 168)) * 3600
    initial_liq = int(params.get("initial_liquidity_usdc", 2) * 10**_USDC_DECIMALS)
    threshold_bps = int(params.get("threshold_bps", 5000))

    # approve USDC for registry to pull initial liquidity
    registry_addr = chain.market_registry.address
    bound.info("usdc_approving", amount=initial_liq)
    await chain.send_tx(
        chain.usdc.functions.approve,
        registry_addr,
        initial_liq,
    )

    # --- mint market ---
    bound.info("market_creating")
    token_id_bytes = _token_id_bytes(primary.token_id)
    create_tx = await chain.send_tx(
        chain.market_registry.functions.createMarket,
        token_id_bytes,
        primary.token_chain,
        primary.token_symbol,
        baseline_price,
        threshold_bps,
        duration_secs,
        th_bytes,
        initial_liq,
    )
    await state.update_mint(signal_id, status=state.PENDING_TRACE, create_tx_hash=create_tx)
    bound.info("market_created", tx=create_tx)

    # get market address from registry
    market_address = await _get_market_address(primary.token_id, chain)
    await state.update_mint(signal_id, market_address=market_address)

    # --- record trace on-chain ---
    bound.info("trace_recording", cid=cid)
    trace_tx = await chain.send_tx(
        chain.trace_registry.functions.recordTrace,
        th_bytes,
        cid,
        bytes.fromhex(sig_hex[2:] if sig_hex.startswith("0x") else sig_hex),
    )
    await state.update_mint(
        signal_id,
        status=state.COMPLETE,
        trace_tx_hash=trace_tx,
        market_address=market_address,
    )

    bound.info("market_minted", address=market_address, trace_tx=trace_tx)
    return market_address


async def _get_baseline_price(signal: Signal, chain: ChainClient) -> int:
    """Return 8-decimal USD price. Retries 3× at 5 s intervals before raising.

    Never falls back to a fake price — a market with a wrong baseline produces
    wrong resolution outcomes, which is worse than not minting at all.
    """
    from agent.collectors.price_anomaly import get_price_usd

    last_exc: Exception | None = None
    for attempt in range(3):
        try:
            price = await get_price_usd(signal.token_id, signal.token_chain)
            return int(price * 10**8)
        except Exception as exc:
            last_exc = exc
            if attempt < 2:
                await asyncio.sleep(5)
    raise RuntimeError(
        f"Baseline price unavailable for {signal.token_symbol} ({signal.token_id})"
        " after 3 attempts — mint aborted"
    ) from last_exc


def _token_id_bytes(token_id: str) -> bytes:
    """Encode token_id as bytes32. Hex addresses → pad. Base58 → utf8 left-pad."""
    if token_id.startswith("0x"):
        raw = bytes.fromhex(token_id[2:])
        return raw.rjust(32, b"\x00")
    encoded = token_id.encode("utf-8")
    return encoded.ljust(32, b"\x00")[:32]


async def _get_market_address(token_id: str, chain: ChainClient) -> str:
    token_id_bytes = _token_id_bytes(token_id)
    markets = await chain.call(
        chain.market_registry.functions.getMarketsByToken(token_id_bytes).call
    )
    return markets[-1] if markets else ""
