from __future__ import annotations

import asyncio
import json
import random
from collections.abc import Awaitable, Callable

import structlog
import websockets
from eth_abi import decode as abi_decode
from web3 import AsyncWeb3, Web3

log = structlog.get_logger()

MARKET_CREATED_TOPIC = "0x" + Web3.keccak(
    text=(
        "MarketCreated(address,bytes32,string,string,"
        "uint256,uint256,uint256,bytes32,uint256,uint256)"
    )
).hex()

# Non-indexed fields in MarketCreated, in ABI order
_NON_INDEXED = [
    "string",   # tokenChain
    "string",   # tokenSymbol
    "uint256",  # baselinePrice
    "uint256",  # thresholdBps
    "uint256",  # resolvesAt
    "bytes32",  # traceHash
    "uint256",  # yesPool
    "uint256",  # noPool
]


def _to_int(val: str | int) -> int:
    if isinstance(val, int):
        return val
    return int(val, 16)


def decode_log(raw: dict) -> dict:
    topics = raw["topics"]
    data_hex: str = raw["data"]
    data_bytes = bytes.fromhex(data_hex[2:] if data_hex.startswith("0x") else data_hex)

    market = Web3.to_checksum_address("0x" + topics[1][-40:])

    (
        token_chain,
        token_symbol,
        baseline_price,
        threshold_bps,
        resolves_at,
        trace_hash_bytes,
        yes_pool,
        no_pool,
    ) = abi_decode(_NON_INDEXED, data_bytes)

    tx_hash = raw.get("transactionHash", "")
    block_number = _to_int(raw.get("blockNumber", "0x0"))

    return {
        "market": market,
        "token_chain": token_chain,
        "token_symbol": token_symbol,
        "baseline_price": baseline_price,
        "threshold_bps": threshold_bps,
        "resolves_at": resolves_at,
        "trace_hash": trace_hash_bytes,
        "yes_pool": yes_pool,
        "no_pool": no_pool,
        "tx_hash": tx_hash if isinstance(tx_hash, str) else tx_hash.hex(),
        "block_number": block_number,
    }


_BACKFILL_CHUNK = 2_000  # Arc RPC rejects ranges larger than ~5k; stay conservative


async def backfill(
    w3: AsyncWeb3,
    registry: str,
    from_block: int,
    callback: Callable[[dict], Awaitable[None]],
) -> int:
    latest = await w3.eth.block_number
    if from_block >= latest:
        return latest

    log.info("backfill_start", from_block=from_block, to_block=latest)
    address = Web3.to_checksum_address(registry)
    total = 0
    chunk_start = from_block

    while chunk_start <= latest:
        chunk_end = min(chunk_start + _BACKFILL_CHUNK - 1, latest)
        try:
            raw_logs = await w3.eth.get_logs(
                {
                    "address": address,
                    "topics": [MARKET_CREATED_TOPIC],
                    "fromBlock": chunk_start,
                    "toBlock": chunk_end,
                }
            )
        except Exception as exc:
            log.error("backfill_chunk_error", from_block=chunk_start, to_block=chunk_end, error=str(exc))
            chunk_start = chunk_end + 1
            continue

        for entry in raw_logs:
            try:
                decoded = decode_log(
                    {
                        "topics": [t.hex() for t in entry["topics"]],
                        "data": entry["data"].hex(),
                        "transactionHash": entry["transactionHash"],
                        "blockNumber": entry["blockNumber"],
                    }
                )
                await callback(decoded)
            except Exception as exc:
                log.error("backfill_decode_error", error=str(exc))

        total += len(raw_logs)
        chunk_start = chunk_end + 1

    log.info("backfill_done", events=total)
    return latest


async def watch(
    wss_url: str,
    registry: str,
    callback: Callable[[dict], Awaitable[None]],
) -> None:
    delay = 1.0
    filter_params = {"address": registry, "topics": [MARKET_CREATED_TOPIC]}

    while True:
        try:
            log.info("wss_connecting", url=wss_url)
            async with websockets.connect(
                wss_url, ping_interval=30, ping_timeout=10
            ) as ws:
                await ws.send(
                    json.dumps(
                        {
                            "jsonrpc": "2.0",
                            "id": 1,
                            "method": "eth_subscribe",
                            "params": ["logs", filter_params],
                        }
                    )
                )
                resp = json.loads(await ws.recv())
                sub_id = resp.get("result")
                if not sub_id:
                    raise RuntimeError(f"eth_subscribe failed: {resp}")

                log.info("wss_subscribed", sub_id=sub_id)
                delay = 1.0  # reset after clean connect

                async for raw_msg in ws:
                    data = json.loads(raw_msg)
                    if data.get("method") != "eth_subscription":
                        continue
                    raw_log = data["params"]["result"]
                    try:
                        decoded = decode_log(raw_log)
                        log.info(
                            "market_created",
                            market=decoded["market"],
                            symbol=decoded["token_symbol"],
                            block=decoded["block_number"],
                        )
                        await callback(decoded)
                    except Exception as exc:
                        log.error("event_decode_error", error=str(exc))

        except asyncio.CancelledError:
            raise
        except Exception as exc:
            jitter = random.uniform(0, delay * 0.2)
            wait = round(delay + jitter, 2)
            log.warning("wss_disconnected", error=str(exc), reconnect_in=wait)
            await asyncio.sleep(wait)
            delay = min(delay * 2, 60.0)
