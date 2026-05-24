# RugOracle

**Autonomous AI prediction markets for rugpull detection, built on Arc Testnet.**

RugOracle watches multiple rug-pull signal sources in real time — including [NostalgiaForInfinity](https://github.com/iterativv/NostalgiaForInfinity)'s community-maintained blacklist and live DEX price anomalies — and autonomously mints binary prediction markets ("will this token lose >50% in 7 days?") within seconds of a detection. Markets are bet on in USDC with embedded wallets and sponsored gas. Every market's reasoning trace is hashed on-chain and pinned to IPFS for full verifiability.

Built for the **Circle / Arc Hackathon** (RFB 03 — Prediction Market Verticals).

---

## Architecture

```
   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
   │ GitHub NFI   │  │ Solana DEX   │  │ BSC DEX      │
   │ blacklist    │  │ price watch  │  │ price watch  │
   └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
          └─────────────────┴────────────────┘
                            │ Signal events
                            ▼
                     ┌──────────────┐
                     │ Agent (LLM)  │ ──── pin trace ──▶ IPFS
                     │ score+decide │
                     └──────┬───────┘
                            │ createMarket(token, params, traceHash)
                            ▼
   ┌──────────────────── Arc Testnet ────────────────────┐
   │  MarketRegistry ◀── deploys ── BinaryMarket (each)  │
   │  TraceRegistry  ◀── stores  ── trace hash + sig     │
   └─────────────────────────────────────────────────────┘
                            ▲
                     ┌──────┴───────┐
                     │  Next.js     │ ── Circle Modular Wallets (passkey)
                     │  frontend    │ ── Paymaster (gasless bets)
                     └──────┬───────┘
                            │
                     ┌──────┴───────┐
                     │ Telegram bot │ posts every new market
                     └──────────────┘
```

**Signal plane** — Async collectors poll external sources (GitHub, Jupiter, Dexscreener) and emit typed `Signal` events to an in-process bus.

**Agent plane** — Scores signals (weighted 0.6 threshold), calls Groq LLM for a structured reasoning trace, pins to IPFS, and sends a `createMarket` transaction.

**Chain plane** — Three Solidity contracts on Arc Testnet. `MarketRegistry` is the factory; `BinaryMarket` holds pools and bets; `TraceRegistry` anchors the agent's reasoning on-chain.

**Distribution plane** — Next.js frontend with Circle Modular Wallets and Paymaster, plus a Telegram bot that auto-posts every new market.

---

## Features

- **Multi-signal fusion** — NFI blacklist (weight 0.5), DEX price anomaly (0.3), Solana LP drain (0.2); scores are combined and a market opens when ≥ 0.6
- **On-chain reasoning traces** — every market's LLM output is canonicalized, SHA-256 hashed, signed by the agent, pinned to IPFS, and recorded in `TraceRegistry`
- **Gasless betting** — Circle Paymaster sponsors gas; users bet in USDC with a passkey smart account (Circle Modular Wallets)
- **Autonomous resolution** — a background resolver polls expired markets every 10 minutes and calls `BinaryMarket.resolve()` against live DEX prices
- **Demo console** — `/demo` page lets you pick a real NFI blacklist addition and trigger the full pipeline live, without waiting for a commit
- **Telegram distribution** — bot posts every minted market to a public channel within 30 seconds, with deep links and IPFS trace enrichment

---

## Stack

| Layer | Technology |
|-------|-----------|
| Contracts | Solidity 0.8.24, Foundry, Arc Testnet |
| Agent | Python 3.11+, web3.py, Groq (`qwen/qwen3-32b`), Pinata IPFS |
| Frontend | Next.js 14 App Router, TypeScript, Tailwind, viem v2 |
| Wallets | Circle Modular Wallets (passkey smart accounts) |
| Gas | Circle Paymaster |
| Bot | Python, `websockets`, aiogram (Telegram) |
| Infra | GNU Make, Vercel (web), raw server (agent + bot) |

---

## Deployed contracts (Arc Testnet)

| Contract | Address |
|----------|---------|
| `MarketRegistry` | [`0xa1Db4fBe80E7064E8bC70b6138a11572cFE1f79b`](https://testnet.arcscan.app/address/0xa1Db4fBe80E7064E8bC70b6138a11572cFE1f79b) |
| `TraceRegistry` | [`0x614A1F64395FD1b925E347AC13812CC48b62f5B7`](https://testnet.arcscan.app/address/0x614A1F64395FD1b925E347AC13812CC48b62f5B7) |
| USDC (ERC-20) | `0x3600000000000000000000000000000000000000` |

Chain ID: `5042002` · Explorer: [testnet.arcscan.app](https://testnet.arcscan.app) · Faucet: [faucet.circle.com](https://faucet.circle.com)

---

## Running locally

### Prerequisites

- [Foundry](https://getfoundry.sh) (for contract work)
- Python 3.11+ and [`uv`](https://github.com/astral-sh/uv) or `pip`
- Node.js 20+ and `npm`
- A funded Arc Testnet wallet (USDC from the faucet above)
- [Groq API key](https://console.groq.com) (free tier works)
- [Pinata JWT](https://app.pinata.cloud) for IPFS pinning
- Circle Console credentials for Modular Wallets (`CIRCLE_CLIENT_KEY` + `CIRCLE_CLIENT_URL`)

### 1. Clone and configure

```bash
git clone https://github.com/SachPlayZ/Rugjeez
cd Rugjeez
```

Copy and fill in the env files for each service:

```bash
cp agent/.env.example agent/.env        # AGENT_PRIVATE_KEY, GROQ_API_KEY, PINATA_JWT
cp web/.env.local.example web/.env.local  # CIRCLE_CLIENT_KEY, CIRCLE_CLIENT_URL
cp bot/.env.example bot/.env             # TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
```

> [!NOTE]
> Contract addresses are already filled in the `.env.example` files from the deployment above. Run `make -f infra/Makefile export-addresses` after any redeploy to update them automatically.

### 2. Install dependencies

```bash
# Agent
cd agent && pip install -e ".[dev]" && cd ..

# Web
cd web && npm install && cd ..

# Bot
cd bot && pip install -e ".[dev]" && cd ..
```

### 3. Start everything (three terminals)

```bash
# Terminal 1 — agent + demo API
cd agent && python -m agent.main

# Terminal 2 — Telegram bot
cd bot && python -m bot.main

# Terminal 3 — Next.js frontend
cd web && npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The `/demo` page lets you trigger a live market mint without waiting for a real signal.

### 4. Seed demo markets (optional)

With the agent running, inject a few starter markets so the feed isn't empty:

```bash
make -f infra/Makefile seed-demo
```

### Check service health

```bash
make -f infra/Makefile status
```

---

## Infra make targets

Run from `infra/` or as `make -f infra/Makefile <target>` from the repo root.

| Target | Description |
|--------|-------------|
| `deploy-contracts` | Forge deploy → `deployed.json` → export ABIs → update env files |
| `abis` | Re-export ABIs after a contract change |
| `export-addresses` | Push addresses from `deployed.json` into all env files |
| `build-agent` | Install Python deps and run ruff lint |
| `run-agent` | Start agent (foreground) |
| `run-bot` | Start Telegram bot (foreground) |
| `dev-web` | Next.js dev server |
| `build-web` | Production Next.js build |
| `deploy-web` | Build + `vercel --prod` |
| `seed-demo` | Inject 3 demo markets via the agent API |
| `refresh-candidates` | Re-fetch NFI blacklist additions for the demo page |
| `status` | Print green/yellow/red health for every service |
| `db-reset` | Wipe agent SQLite state for a clean restart |

---

## Repo layout

```
contracts/   Solidity 0.8.24 (Foundry) — MarketRegistry, BinaryMarket, TraceRegistry
agent/       Python agent — collectors, scorer, LLM reasoner, IPFS, executor, resolver
web/         Next.js 14 — live feed, market detail, demo console, bet UI
bot/         Python Telegram/Twitter bot — posts every new market
infra/       Makefile + deploy/abi/seed/status scripts
```

---

## Known limitations

> [!IMPORTANT]
> This is a hackathon project running on Arc **Testnet**. All volume is testnet USDC.

1. **Centralized resolver** — v1 uses a backend process to call `resolve()`; production would use Chainlink/Pyth with a permissionless challenge window.
2. **Hardcoded token map** — `symbol_map.json` covers the ~70 most-watched memecoins. A token not in the map is logged and skipped.
3. **Signal scope** — ships with NFI blacklist + DEX price anomaly. Solana LP drain and social velocity are roadmap items.
4. **Twitter** — API v2 write access requires a paid tier (~$100/mo). The stub is in `bot/twitter.py`; Telegram is the primary channel.
5. **Arc mainnet** — targeted for summer 2026. All markets are on testnet until then.
