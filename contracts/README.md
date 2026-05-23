# contracts/

Foundry project for RugOracle's on-chain protocol. Three contracts on Arc Testnet.

## Contracts

| Contract | Purpose |
|---|---|
| `MarketRegistry` | Factory + index. Only the agent wallet can call `createMarket`. |
| `BinaryMarket` | One binary prediction market per flagged token. Users bet YES/NO in USDC. |
| `TraceRegistry` | Stores agent reasoning trace hashes and IPFS CIDs for verifiability. |

## Prerequisites

- [Foundry](https://getfoundry.sh) installed
- Arc Testnet faucet USDC + ETH on your agent wallet (https://faucet.circle.com)

## Running tests

```bash
forge test -v
```

## Deploying to Arc Testnet

```bash
export USDC_ADDRESS=0x3600000000000000000000000000000000000000
export AGENT_ADDRESS=0x...          # your agent wallet
export RESOLVER_ADDRESS=0x...       # same or separate resolver wallet
export PRIVATE_KEY=0x...            # deployer private key

forge script script/Deploy.s.sol \
  --rpc-url https://rpc.testnet.arc.network \
  --broadcast \
  --private-key $PRIVATE_KEY
```

Addresses are printed to stdout. Copy them to `infra/deployed.json` and run `make abis`.

## ABI export

After deploy, from repo root:

```bash
make abis
```

This copies compiled ABIs from `contracts/out/` to `agent/agent/abis/` and `web/src/lib/abis/`.

## Arc Testnet

| | |
|---|---|
| Chain ID | `5042002` |
| RPC | `https://rpc.testnet.arc.network` |
| Explorer | `https://testnet.arcscan.app` |
| USDC | `0x3600000000000000000000000000000000000000` (6 decimals ERC-20) |
