# RugOracle — infra

Deploy, run, and seed scripts for RugOracle.

## Quick start (first time)

```bash
# 1. Set up agent secrets
cp agent/.env.example agent/.env
# Fill in AGENT_PRIVATE_KEY, GROQ_API_KEY, PINATA_JWT (and optionally GITHUB_TOKEN)

# 2. Deploy contracts + export ABIs + push addresses to env files
make -f infra/Makefile deploy-contracts

# 3. Set up web secrets
cp web/.env.local.example web/.env.local
# Fill in NEXT_PUBLIC_CIRCLE_CLIENT_KEY (get from Circle dashboard)
# Addresses are already set by deploy-contracts

# 4. Set up bot secrets
cp bot/.env.example bot/.env
# Fill in TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID

# 5. Install deps
make -f infra/Makefile build-agent
cd web && npm install
```

## Running everything (three terminals)

```bash
# Terminal 1 — agent
make -f infra/Makefile run-agent

# Terminal 2 — bot
make -f infra/Makefile run-bot

# Terminal 3 — web
make -f infra/Makefile dev-web
```

## Make targets

| Target | What it does |
|--------|-------------|
| `deploy-contracts` | Forge deploy → `deployed.json` → ABIs → env files |
| `abis` | Re-export ABIs after a contract change |
| `export-addresses` | Push addresses from `deployed.json` to env files |
| `build-agent` | Install Python deps + ruff lint |
| `run-agent` | Start agent (foreground) |
| `run-bot` | Start Telegram/Twitter bot (foreground) |
| `dev-web` | Next.js dev server |
| `build-web` | Production Next.js build |
| `deploy-web` | Build + `vercel --prod` |
| `seed-demo` | Inject 3 demo markets (agent must be running) |
| `refresh-candidates` | Re-fetch NFI blacklist additions |
| `status` | Print green/yellow/red health for every service |
| `db-reset` | Wipe agent SQLite state for a clean restart |

Run from either the repo root (`make -f infra/Makefile <target>`) or from `infra/` (`make <target>`).

## Deployed addresses (Arc Testnet)

See `infra/deployed.json` for the canonical record.

| Contract | Address |
|----------|---------|
| MarketRegistry | `0xa1Db4fBe80E7064E8bC70b6138a11572cFE1f79b` |
| TraceRegistry  | `0x614A1F64395FD1b925E347AC13812CC48b62f5B7` |
| USDC           | `0x3600000000000000000000000000000000000000` |

Explorer: https://testnet.arcscan.app

## Contract redeploy

If you redeploy contracts (new agent address, logic change, etc.):

```bash
make -f infra/Makefile deploy-contracts
# Automatically: forge deploy → deployed.json → abis → env files
```

Then restart the agent and bot — they read addresses from env on startup.
