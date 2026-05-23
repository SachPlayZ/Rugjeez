from __future__ import annotations

import os

import aiohttp

from agent.logging import get_logger

log = get_logger(__name__)

_PINATA_URL = "https://api.pinata.cloud/pinning/pinJSONToIPFS"
_GATEWAY = "https://gateway.pinata.cloud/ipfs/"


async def pin_json(obj: dict) -> str:
    """Pin obj to IPFS via Pinata. Returns CID."""
    jwt = os.environ["PINATA_JWT"]
    async with aiohttp.ClientSession() as session:
        async with session.post(
            _PINATA_URL,
            json={"pinataContent": obj},
            headers={"Authorization": f"Bearer {jwt}"},
        ) as resp:
            resp.raise_for_status()
            data = await resp.json()
            cid: str = data["IpfsHash"]
            log.info("ipfs_pinned", cid=cid)

    # warm gateway
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{_GATEWAY}{cid}", timeout=aiohttp.ClientTimeout(total=30)) as r:
                await r.read()
    except Exception:
        pass  # gateway warm is best-effort

    return cid


def gateway_url(cid: str) -> str:
    return f"{_GATEWAY}{cid}"
