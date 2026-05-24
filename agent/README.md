# Rugjeez Agent

Python agent that watches rug-pull signals and autonomously mints binary prediction markets on Arc Testnet.

## Quick start

```bash
cd agent
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env   # fill in AGENT_PRIVATE_KEY, ANTHROPIC_API_KEY, PINATA_JWT
python -m agent.main
```

Health endpoint: `GET http://localhost:8787/health`

## Environment variables

See `.env.example`. Required before running:

| Var | Description |
|-----|-------------|
| `AGENT_PRIVATE_KEY` | Wallet key — must be funded with USDC on Arc Testnet |
| `GROQ_API_KEY` | Groq API key for reasoning (default model: `qwen/qwen3-32b`) |
| `PINATA_JWT` | Pinata JWT for IPFS pinning |
| `NFI_BLACKLIST_PATH` | Path within `iterativv/NostalgiaForInfinity` repo to blacklist file |

## Architecture

```
collectors/
  nfi_blacklist.py   — polls GitHub every 60s, emits Signal on new entries
  price_anomaly.py   — polls DEX prices every 5min, emits on >20% drop

SignalBus            — asyncio.Queue connecting collectors → agent loop

scorer.py            — weighted score; THRESHOLD=0.6 to open market
reasoner.py          — Claude (claude-opus-4-7) generates structured trace JSON
executor.py          — pins trace → IPFS, mints market, records trace on-chain
resolver.py          — polls every 10min, resolves expired markets vs current price

health.py            — /health endpoint state
state.py             — SQLite idempotency tracking (agent_state.db)
nonce.py             — local nonce counter with resync on errors
chain.py             — web3.py + tenacity RPC retry + 20 Gwei gas floor
```

## Running tests

```bash
pytest tests/ -v
```

16 tests cover: scorer weights, canonical JSON hashing, SQLite state transitions + reconciliation.

## Funded wallet requirement

The agent wallet needs USDC on Arc Testnet to seed initial market liquidity (2 USDC per market).  
Faucet: https://faucet.circle.com

## Cross-cutting concerns implemented

- TTL caching (`cache.py`) on all external HTTP calls
- SQLite idempotency (`state.py`) prevents duplicate markets on restart
- NonceManager (`nonce.py`) prevents nonce collisions under concurrent mints
- Tenacity retry (`chain.py`) on all RPC calls
- structlog JSON logging with `signal_id` propagated through full pipeline
- `/health` endpoint on FastAPI
- Reconciliation on startup: in-flight rows from prior crash → marked failed
