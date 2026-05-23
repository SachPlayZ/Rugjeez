from __future__ import annotations

import asyncio

from web3 import AsyncWeb3


class NonceManager:
    def __init__(self, w3: AsyncWeb3, address: str) -> None:
        self.w3 = w3
        self.address = address
        self._nonce: int | None = None
        self._lock = asyncio.Lock()

    async def next(self) -> int:
        async with self._lock:
            if self._nonce is None:
                self._nonce = await self.w3.eth.get_transaction_count(
                    self.address, "pending"
                )
            current = self._nonce
            self._nonce += 1
            return current

    async def resync(self) -> None:
        async with self._lock:
            self._nonce = await self.w3.eth.get_transaction_count(
                self.address, "pending"
            )
