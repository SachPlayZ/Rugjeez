from __future__ import annotations

import asyncio

import aiohttp
import structlog
from web3 import AsyncWeb3

log = structlog.get_logger()

_ABI = [
    {
        "type": "function",
        "name": "getTrace",
        "inputs": [{"name": "traceHash", "type": "bytes32"}],
        "outputs": [
            {"name": "ipfsCid", "type": "string"},
            {"name": "signature", "type": "bytes"},
            {"name": "timestamp", "type": "uint256"},
        ],
        "stateMutability": "view",
    }
]

# MarketCreated fires before recordTrace lands. Retry gives the trace tx time
# to confirm and the IPFS gateway time to warm up.
_MAX_ATTEMPTS = 6
_RETRY_DELAY = 10  # seconds between attempts (total wait up to ~50s)


async def fetch_trace(
    w3: AsyncWeb3,
    trace_registry: str,
    trace_hash: bytes,
    ipfs_gateway: str,
) -> dict | None:
    contract = w3.eth.contract(
        address=w3.to_checksum_address(trace_registry), abi=_ABI
    )

    for attempt in range(_MAX_ATTEMPTS):
        try:
            ipfs_cid, _, _ = await contract.functions.getTrace(trace_hash).call()
            if not ipfs_cid:
                # Trace tx not yet landed — wait and retry
                if attempt < _MAX_ATTEMPTS - 1:
                    log.debug("trace_not_on_chain_yet", attempt=attempt + 1)
                    await asyncio.sleep(_RETRY_DELAY)
                continue

            url = f"{ipfs_gateway.rstrip('/')}/{ipfs_cid}"
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    url, timeout=aiohttp.ClientTimeout(total=15)
                ) as resp:
                    if resp.status == 200:
                        return await resp.json(content_type=None)
                    log.warning(
                        "ipfs_fetch_non200",
                        status=resp.status,
                        cid=ipfs_cid,
                        attempt=attempt + 1,
                    )
        except Exception as exc:
            log.warning("trace_fetch_error", error=str(exc), attempt=attempt + 1)

        if attempt < _MAX_ATTEMPTS - 1:
            await asyncio.sleep(_RETRY_DELAY)

    log.warning("trace_fetch_exhausted", attempts=_MAX_ATTEMPTS)
    return None
