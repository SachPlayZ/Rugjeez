<div align="center">

<img src="./web/public/RugjeezLogo.png" alt="Rugjeez Logo" width="200"/>

**AI agent that spots rug pulls before they happen — and opens prediction markets on them.**

[![Arc Testnet](https://img.shields.io/badge/Arc-Testnet-blueviolet?style=flat-square)](https://testnet.arcscan.app)
[![Chain ID](https://img.shields.io/badge/Chain_ID-5042002-blue?style=flat-square)](https://rpc.testnet.arc.network)
[![Built with Circle](https://img.shields.io/badge/Built_with-Circle_Stack-00D395?style=flat-square)](https://circle.com)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-363636?style=flat-square&logo=solidity)](https://soliditylang.org)

[Live Demo](#running-locally) · [Contracts](#deployed-contracts) · [Architecture](#architecture) · [Quick Start](#running-locally)

</div>

---

## What is Rugjeez?

Memecoin rugs happen every day. The people best at spotting them — like [`iterativv`](https://github.com/iterativv), maintainer of [NostalgiaForInfinity](https://github.com/iterativv/NostalgiaForInfinity) (3.2k⭐, the leading public Freqtrade strategy) — already publish their work publicly as plaintext blacklist commits on GitHub.

**Rugjeez automates the rest.**

It parses that feed, fuses it with live DEX price signals, scores each flagged token using a weighted multi-signal model, and lets an LLM decide whether to open a market. When it does — a binary prediction market ("will this token lose >50% in 7 days?") is minted on Arc Testnet within seconds. Markets resolve automatically from public DEX prices. Anyone bets in USDC, gaslessly, with a passkey smart account.

Every decision the agent makes is hashed on-chain and pinned to IPFS — fully auditable, no black box.

---

## Architecture

```
  SIGNAL PLANE
  ┌─────────────────────┐  ┌──────────────────────┐
  │  GitHub NFI         │  │  DEX price anomaly   │
  │  blacklist poller   │  │  (Jupiter / Dexscr.) │
  │  every 60s          │  │  every 5 min         │
  └──────────┬──────────┘  └──────────┬───────────┘
             └──────────┬─────────────┘
                        │ Signal { source, severity, token }
                        ▼
  AGENT PLANE     ┌─────────────┐
                  │   scorer    │  weighted score ≥ 0.6 → proceed
                  └──────┬──────┘
                         │
                  ┌──────▼──────┐
                  │  reasoner   │  Groq LLM → structured trace JSON
                  └──────┬──────┘
                         │ pin to IPFS (Pinata)
                  ┌──────▼──────┐
                  │  executor   │  send createMarket() tx on Arc
                  └──────┬──────┘

  CHAIN PLANE             │
  ┌─────────────────────Arc Testnet──────────────────────┐
  │  MarketRegistry ◀─ createMarket() ─ BinaryMarket     │
  │  TraceRegistry  ◀─ recordTrace()  ─ hash + sig       │
  └──────────────────────────────────────────────────────┘
                          │
  DISTRIBUTION            │
  ┌─────────────┐   ┌──────▼───────┐
  │  Telegram   │   │  Next.js 14  │  Circle Modular Wallets (passkey)
  │  bot        │   │  frontend    │  Circle Paymaster (gasless bets)
  └─────────────┘   └──────────────┘
```

| Plane | Responsibility |
|-------|---------------|
| **Signal** | Poll GitHub commits + DEX APIs, emit typed `Signal` events |
| **Agent** | Score → reason (LLM) → pin IPFS → mint market → resolve |
| **Chain** | `MarketRegistry` factory, `BinaryMarket` AMM pools, `TraceRegistry` audit log |
| **Distribution** | Next.js feed + bet UI, Telegram bot auto-posts every market |

---

## Key features

**Multi-signal fusion** — NFI blacklist (weight 0.5), DEX price anomaly (0.3), Solana LP drain (0.2). Score ≥ 0.6 triggers a market. Manual demo injections bypass the threshold entirely.

**Verifiable AI reasoning** — LLM output is canonicalized (sorted keys, no whitespace), SHA-256 hashed, signed with the agent key, pinned to IPFS, and the hash is recorded in `TraceRegistry`. Any judge can verify it.

**Gasless USDC betting** — Circle Modular Wallets gives users a passkey smart account in one tap. Circle Paymaster sponsors every bet transaction. No ETH needed, ever.

**Autonomous resolution** — a background process polls expired markets every 10 minutes, fetches the current DEX price, and calls `BinaryMarket.resolve()`.

**Demo console** — `/demo` page pulls real recent NFI blacklist additions and lets you trigger the full pipeline live — no waiting for a commit to land.

**Telegram distribution** — bot posts every minted market within 30 seconds, with IPFS-enriched confidence scores and deep links. Demo markets get a `🧪` tag for honesty.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Contracts | Solidity 0.8.24 · Foundry · Arc Testnet |
| Agent | Python 3.11 · web3.py · Groq `qwen/qwen3-32b` · Pinata IPFS |
| Frontend | Next.js 14 App Router · TypeScript · Tailwind · viem v2 |
| Wallets | Circle Modular Wallets (passkey smart accounts) |
| Gas | Circle Paymaster |
| Bot | Python · `websockets` · aiogram (Telegram) |
| Infra | GNU Make · Vercel (web) |

---

## Deployed contracts

> Arc Testnet · Chain ID `5042002` · [testnet.arcscan.app](https://testnet.arcscan.app)

| Contract | Address | Explorer |
|----------|---------|---------|
| `MarketRegistry` | `0xa1Db4fBe80E7064E8bC70b6138a11572cFE1f79b` | [view ↗](https://testnet.arcscan.app/address/0xa1Db4fBe80E7064E8bC70b6138a11572cFE1f79b) |
| `TraceRegistry` | `0x614A1F64395FD1b925E347AC13812CC48b62f5B7` | [view ↗](https://testnet.arcscan.app/address/0x614A1F64395FD1b925E347AC13812CC48b62f5B7) |
| USDC (ERC-20) | `0x3600000000000000000000000000000000000000` | 6 decimals |

Agent / resolver wallet: `0xe34b40f38217f9Dc8c3534735f7f41B2cDA73A75`

---

## Running locally

### Prerequisites

| Tool | Purpose | Get it |
|------|---------|--------|
| [Foundry](https://getfoundry.sh) | Contract build + deploy | `curl -L https://foundry.paradigm.xyz \| bash` |
| Python 3.11+ | Agent + bot | [python.org](https://python.org) |
| [`uv`](https://github.com/astral-sh/uv) | Fast Python package manager | `pip install uv` |
| Node.js 20+ | Frontend | [nodejs.org](https://nodejs.org) |
| Arc Testnet USDC | Seeds market liquidity (2 USDC/market) | [faucet.circle.com](https://faucet.circle.com) |
| [Groq API key](https://console.groq.com) | LLM reasoning (free tier works) | console.groq.com |
| [Pinata JWT](https://app.pinata.cloud) | IPFS pinning | app.pinata.cloud |
| Circle Console creds | Modular Wallets SDK | [console.circle.com](https://console.circle.com) |

### 1 — Configure secrets

```bash
git clone https://github.com/SachPlayZ/Rugjeez && cd Rugjeez

cp agent/.env.example agent/.env       # AGENT_PRIVATE_KEY · GROQ_API_KEY · PINATA_JWT
cp web/.env.local.example web/.env.local  # CIRCLE_CLIENT_KEY · CIRCLE_CLIENT_URL
cp bot/.env.example bot/.env           # TELEGRAM_BOT_TOKEN · TELEGRAM_CHAT_ID
```

> [!NOTE]
> Contract addresses are already pre-filled from the deployment above. Run `make -f infra/Makefile export-addresses` after any redeploy to refresh them across all env files automatically.

### 2 — Install dependencies

```bash
cd agent && pip install -e ".[dev]" && cd ..
cd web   && npm install               && cd ..
cd bot   && pip install -e ".[dev]"  && cd ..
```

### 3 — Start all services

Open three terminals:

```bash
# Terminal 1 — agent (signal watching + demo API on :8787)
cd agent && python -m agent.main

# Terminal 2 — Telegram bot (health on :8788)
cd bot && python -m bot.main

# Terminal 3 — frontend
cd web && npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Hit `/demo` to trigger a live market mint from a real NFI blacklist entry — no waiting for a commit.

### 4 — Seed the feed (optional)

```bash
make -f infra/Makefile seed-demo    # injects 3 demo markets; agent must be running
```

### Check service health

```bash
make -f infra/Makefile status       # green/yellow/red per service + Arc RPC block
```

---

## Repo structure

```
Rugjeez/
├── contracts/    Solidity 0.8.24 (Foundry) — MarketRegistry, BinaryMarket, TraceRegistry
├── agent/        Python agent — collectors, scorer, LLM reasoner, executor, resolver
├── web/          Next.js 14 — live feed, market detail, TraceViewer, bet UI, demo console
├── bot/          Telegram bot — auto-posts every market within 30s
├── infra/        Makefile + deploy / ABI / seed / status scripts
└── infra/deployed.json   canonical contract addresses
```

---

## Infra make targets

```bash
make -f infra/Makefile <target>   # from repo root
make <target>                     # from infra/
```

| Target | Description |
|--------|-------------|
| `deploy-contracts` | Forge deploy → `deployed.json` → export ABIs → update all env files |
| `abis` | Re-export ABIs after any contract change |
| `export-addresses` | Push addresses from `deployed.json` into agent, web, and bot env files |
| `build-agent` | Install Python deps + ruff lint |
| `run-agent` | Start agent (foreground) |
| `run-bot` | Start Telegram bot (foreground) |
| `dev-web` | Next.js dev server |
| `build-web` | Production Next.js build |
| `deploy-web` | Build + `vercel --prod` |
| `seed-demo` | Inject 3 demo markets via the agent API |
| `refresh-candidates` | Re-fetch NFI blacklist additions for the demo page |
| `status` | Green / yellow / red health for every service |
| `db-reset` | Wipe agent SQLite state for a clean restart |

---

## Limitations & roadmap

> [!IMPORTANT]
> Rugjeez runs on Arc **Testnet** only. All USDC is testnet. Arc mainnet is targeted for summer 2026.

| Limitation | Current v1 | Roadmap |
|-----------|-----------|---------|
| Resolution | Centralized backend process | Chainlink / Pyth + permissionless challenge window |
| Token mapping | Hardcoded `symbol_map.json` (~70 tokens) | On-chain registry with community submissions |
| Signal sources | NFI blacklist + DEX price anomaly | Solana LP drain, social velocity |
| Twitter | Stub only (paid API tier ~$100/mo) | Enable when budget allows |
| Gas | Paymaster-sponsored on testnet | Mainnet paymaster when Arc launches |

---

<div align="center">

Built for the **Circle / Arc Hackathon** · targeting RFB 03 (Prediction Market Verticals)

</div>
