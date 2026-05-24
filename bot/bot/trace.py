from __future__ import annotations

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


async def fetch_trace(
    w3: AsyncWeb3,
    trace_registry: str,
    trace_hash: bytes,
    ipfs_gateway: str,
) -> dict | None:
    try:
        contract = w3.eth.contract(
            address=w3.to_checksum_address(trace_registry), abi=_ABI
        )
        ipfs_cid, _, _ = await contract.functions.getTrace(trace_hash).call()
        if not ipfs_cid:
            return None
        url = f"{ipfs_gateway.rstrip('/')}/{ipfs_cid}"
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=15)) as resp:
                if resp.status == 200:
                    return await resp.json(content_type=None)
                log.warning("ipfs_fetch_non200", status=resp.status, cid=ipfs_cid)
    except Exception as exc:
        log.warning("trace_fetch_error", error=str(exc))
    return None
