# Rugjeez Bot

Watches `MarketRegistry.MarketCreated` events on Arc Testnet and posts to Telegram within 30s.

## Setup

```bash
cd bot
uv venv && uv pip install -e ".[dev]"
cp .env.example .env
# fill TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID
```

### Create a Telegram bot

1. Chat with @BotFather → `/newbot` → copy token → set `TELEGRAM_BOT_TOKEN`
2. Create a public channel, add the bot as admin
3. Set `TELEGRAM_CHAT_ID` to `@yourchannel` or the numeric id

## Run

```bash
uv run rugjeez-bot
# or
python -m bot.main
```

Health check: `curl http://localhost:8788/health`

## Environment variables

| Var | Required | Default | Notes |
|-----|----------|---------|-------|
| `ARC_WSS_URL` | yes | — | `wss://rpc.testnet.arc.network` |
| `ARC_RPC_URL` | no | `https://rpc.testnet.arc.network` | HTTP fallback for backfill + contract reads |
| `MARKET_REGISTRY_ADDRESS` | yes | — | From Module 1 deploy |
| `TRACE_REGISTRY_ADDRESS` | yes | — | From Module 1 deploy |
| `TELEGRAM_BOT_TOKEN` | yes | — | From @BotFather |
| `TELEGRAM_CHAT_ID` | yes | — | Channel id or `@handle` |
| `WEB_BASE_URL` | no | `https://rugjeez.xyz` | Deep link base |
| `EXPLORER_URL` | no | `https://testnet.arcscan.app` | Trace tx links |
| `IPFS_GATEWAY` | no | `https://gateway.pinata.cloud/ipfs/` | For trace fetch |
| `DB_PATH` | no | `bot_state.db` | SQLite state file |
| `BOT_PORT` | no | `8788` | Health endpoint port |
| `LOG_LEVEL` | no | `INFO` | Structured JSON logs |

## Features

- **WSS reconnect** — exponential backoff starting at 1s, capped at 60s, with jitter
- **Backfill on restart** — replays missed events from last-seen block
- **Idempotency** — SQLite tracks posted markets; duplicate events are skipped
- **Demo tagging** — markets minted via the demo injector are tagged `🧪 demo mint`
- **Trace enrichment** — fetches confidence + signal summary from IPFS via TraceRegistry

## Twitter

Twitter API v2 write access requires the paid Basic tier (~$100/mo). The stub is in `bot/twitter.py`. Wire up when budget allows.
