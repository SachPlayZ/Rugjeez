#!/usr/bin/env python3
"""
One-shot script: pins agent-registration.json to Pinata, then calls
register(agentURI) on the ERC-8004 Identity Registry on Base Sepolia.

Usage:
    PINATA_JWT=... AGENT_PRIVATE_KEY=0x... python scripts/register_erc8004.py

After success, copy the printed agentId into:
  - agent-registration.json  (registrations[].agentId)
  - web/.env.local            (NEXT_PUBLIC_ERC8004_AGENT_ID)
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import requests
from eth_account import Account
from web3 import Web3

# ERC-8004 Identity Registry — same address on 40+ chains
IDENTITY_REGISTRY = "0x8004A818BFB912233c491871b3d84c89A494BD9e"
REGISTER_ABI = [
    {
        "inputs": [{"name": "agentURI", "type": "string"}],
        "name": "register",
        "outputs": [{"name": "agentId", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function",
    }
]

# Base Sepolia — ERC-8004 deployed, free faucet at https://faucet.circle.com
BASE_SEPOLIA_RPC = "https://sepolia.base.org"
BASE_SEPOLIA_CHAIN_ID = 84532

REGISTRATION_FILE = Path(__file__).parent.parent / "agent-registration.json"
PINATA_API = "https://api.pinata.cloud/pinning/pinJSONToIPFS"


def pin_to_ipfs(jwt: str, data: dict) -> str:
    resp = requests.post(
        PINATA_API,
        headers={"Authorization": f"Bearer {jwt}", "Content-Type": "application/json"},
        json={"pinataContent": data, "pinataMetadata": {"name": "rugjeez-agent-registration"}},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["IpfsHash"]


def main() -> None:
    jwt = os.environ.get("PINATA_JWT") or sys.exit("PINATA_JWT not set")
    pk = os.environ.get("AGENT_PRIVATE_KEY") or sys.exit("AGENT_PRIVATE_KEY not set")

    registration = json.loads(REGISTRATION_FILE.read_text())

    print("Pinning agent-registration.json to IPFS…")
    cid = pin_to_ipfs(jwt, registration)
    agent_uri = f"ipfs://{cid}"
    print(f"  CID: {cid}")
    print(f"  URI: {agent_uri}")

    w3 = Web3(Web3.HTTPProvider(BASE_SEPOLIA_RPC))
    account = Account.from_key(pk)
    registry = w3.eth.contract(
        address=Web3.to_checksum_address(IDENTITY_REGISTRY), abi=REGISTER_ABI
    )

    print(f"\nRegistering on Base Sepolia from {account.address}…")
    tx = registry.functions.register(agent_uri).build_transaction(
        {
            "from": account.address,
            "chainId": BASE_SEPOLIA_CHAIN_ID,
            "nonce": w3.eth.get_transaction_count(account.address),
            "gas": 200_000,
            "maxFeePerGas": w3.to_wei(2, "gwei"),
            "maxPriorityFeePerGas": w3.to_wei(1, "gwei"),
        }
    )
    signed = account.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    print(f"  tx: {tx_hash.hex()}")

    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
    if receipt.status != 1:
        sys.exit("Transaction reverted")

    # Decode agentId from Transfer event logs (ERC-721 mint = tokenId)
    transfer_topic = w3.keccak(text="Transfer(address,address,uint256)").hex()
    agent_id: int | None = None
    for log in receipt.logs:
        if log.topics and log.topics[0].hex() == transfer_topic:
            agent_id = int(log.topics[3].hex(), 16)
            break

    print(f"\n✓ Registered! agentId = {agent_id}")
    print(f"\nNext steps:")
    print(f"  1. Update agent-registration.json registrations[] with agentId={agent_id}")
    print(f"  2. Set NEXT_PUBLIC_ERC8004_AGENT_ID={agent_id} in web/.env.local")
    print(f"  3. Re-pin the updated agent-registration.json (optional)")


if __name__ == "__main__":
    main()
