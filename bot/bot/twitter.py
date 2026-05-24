from __future__ import annotations


# Twitter API v2 write access requires the Basic tier (~$100/mo).
# Roadmap: wire up when budget allows.
async def post(
    api_key: str,
    api_secret: str,
    access_token: str,
    access_secret: str,
    text: str,
) -> bool:
    raise NotImplementedError(
        "Twitter posting requires paid API tier. Set TELEGRAM credentials instead."
    )
