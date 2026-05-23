from __future__ import annotations

import asyncio
from typing import AsyncGenerator

from agent.models import Signal


class SignalBus:
    def __init__(self) -> None:
        self._queue: asyncio.Queue[Signal] = asyncio.Queue()

    async def publish(self, signal: Signal) -> None:
        await self._queue.put(signal)

    async def consume(self) -> AsyncGenerator[Signal, None]:
        while True:
            yield await self._queue.get()
