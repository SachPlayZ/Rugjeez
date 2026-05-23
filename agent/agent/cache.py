from __future__ import annotations

import hashlib
import json
from functools import wraps
from typing import Any

from cachetools import TTLCache

caches: dict[str, TTLCache] = {
    "jupiter": TTLCache(maxsize=500, ttl=30),
    "dexscreener": TTLCache(maxsize=500, ttl=60),
    "github_blob": TTLCache(maxsize=100, ttl=300),
    "github_api": TTLCache(maxsize=200, ttl=300),
    "solana_rpc": TTLCache(maxsize=500, ttl=30),
}


def _cache_key(*args: Any, **kwargs: Any) -> str:
    return hashlib.sha256(
        json.dumps([args, kwargs], default=str, sort_keys=True).encode()
    ).hexdigest()


def cached(source: str):
    def decorator(fn):
        @wraps(fn)
        async def wrapper(*args, **kwargs):
            key = _cache_key(*args, **kwargs)
            cache = caches[source]
            if key in cache:
                return cache[key]
            result = await fn(*args, **kwargs)
            cache[key] = result
            return result

        return wrapper

    return decorator
