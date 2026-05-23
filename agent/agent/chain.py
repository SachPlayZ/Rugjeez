from __future__ import annotations

import json
import os
from pathlib import Path

from eth_account import Account
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential
from web3 import AsyncWeb3
from web3.exceptions import Web3RPCError
from web3.middleware import ExtraDataToPOAMiddleware

from agent.logging import get_logger
from agent.nonce import NonceManager

log = get_logger(__name__)

_ABIS_DIR = Path(__file__).parent / "abis"
_MIN_MAX_FEE_PER_GAS = 20 * 10**9  # 20 Gwei floor


def _load_abi(name: str) -> list:
    return json.loads((_ABIS_DIR / f"{name}.json").read_text())["abi"]


class ChainClient:
    def __init__(self) -> None:
        rpc_url = os.environ["ARC_RPC_URL"]
        private_key = os.environ["AGENT_PRIVATE_KEY"]

        self.w3 = AsyncWeb3(AsyncWeb3.AsyncHTTPProvider(rpc_url))
        self.w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)

        self.account = Account.from_key(private_key)
        self.address = self.account.address
        self.nonce_mgr = NonceManager(self.w3, self.address)

        usdc_addr = os.environ["USDC_ADDRESS"]
        registry_addr = os.environ["MARKET_REGISTRY_ADDRESS"]
        trace_addr = os.environ["TRACE_REGISTRY_ADDRESS"]

        self.usdc = self.w3.eth.contract(
            address=self.w3.to_checksum_address(usdc_addr),
            abi=_load_abi("ERC20"),
        )
        self.market_registry = self.w3.eth.contract(
            address=self.w3.to_checksum_address(registry_addr),
            abi=_load_abi("MarketRegistry"),
        )
        self.trace_registry = self.w3.eth.contract(
            address=self.w3.to_checksum_address(trace_addr),
            abi=_load_abi("TraceRegistry"),
        )

    def binary_market_at(self, address: str):
        return self.w3.eth.contract(
            address=self.w3.to_checksum_address(address),
            abi=_load_abi("BinaryMarket"),
        )

    @retry(
        stop=stop_after_attempt(5),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type((ConnectionError, TimeoutError, Web3RPCError)),
        reraise=True,
    )
    async def call(self, fn, *args, **kwargs):
        return await fn(*args, **kwargs)

    async def send_tx(self, fn, *args, value: int = 0) -> str:
        """Build, sign, broadcast a tx. Returns tx hash hex."""
        nonce = await self.nonce_mgr.next()
        gas_price = await self._gas_price()

        try:
            tx = await fn(*args).build_transaction(
                {
                    "from": self.address,
                    "nonce": nonce,
                    "maxFeePerGas": gas_price,
                    "maxPriorityFeePerGas": gas_price,
                    "value": value,
                }
            )
            signed = self.account.sign_transaction(tx)
            tx_hash = await self.w3.eth.send_raw_transaction(signed.raw_transaction)
            receipt = await self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)
            if receipt["status"] != 1:
                raise RuntimeError(f"tx reverted: {tx_hash.hex()}")
            return tx_hash.hex()
        except Exception as exc:
            err = str(exc)
            if "nonce too low" in err or "nonce too high" in err:
                await self.nonce_mgr.resync()
            raise

    async def _gas_price(self) -> int:
        price = await self.w3.eth.gas_price
        return max(price, _MIN_MAX_FEE_PER_GAS)
