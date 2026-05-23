# CLAUDE.md

Project instructions for Claude Code. Read this **and** PLAN.md at the start of every session.

## What this project is

**RugOracle** — an autonomous AI agent on Arc Testnet that mints binary prediction markets ("will this token lose >50% in 7 days") when its multi-signal rug detector crosses a threshold. Built for the Circle / Arc hackathon. Two-day build, eight modules.

## Workflow — read this every session

**This project is built module by module, not all at once.** PLAN.md is the source of truth for which modules exist, what they contain, and what's done.

### At the start of every session

1. Read `PLAN.md` in full.
2. Look at the **Module status board**. Find the next module that is `not_started` or `in_progress` and whose dependencies are `complete`.
3. Ask the human: "PLAN.md shows Module N (`<name>`) is the next eligible module. Work on it now?" — wait for confirmation. The human may want to jump out of order or do something else; respect that.
4. Once confirmed, set that module's **Status** to `in_progress` in PLAN.md and commit (`plan: start module N`).

### While working on a module

- Work **only** on the confirmed module. Do not silently start adjacent modules.
- When you need something from a previous module's **Handoff** section (addresses, env vars, etc.), use those values verbatim. Do not invent values.
- **Commit every 15–20 minutes minimum.** Every passing test, every meaningful chunk of working code. If you find yourself thinking "let me get this whole thing working first," stop and commit what works. Recovery cost is bounded by your last commit.
- Conventional commits: `feat(contracts): add BinaryMarket.bet()`, `test(agent): cover NFI parser edge case`, `chore(infra): wire abi export`, `plan: ...` for PLAN.md updates.
- **Honor the Cross-cutting concerns section in PLAN.md.** Caching, idempotency, nonce management, RPC retry, structured logging, health endpoints, event pagination, optimistic UI, error boundaries, and mobile responsiveness are not optional polish — they are part of each module's definition of done. Each module's "Cross-cutting checklist" must be all-green before marking the module complete.
- If you hit something that forces a pivot per the rules in PLAN.md ("Pivot rules" section), pause and tell the human before pivoting. Then log it in PLAN.md's **Pivot Log**.

### At the end of every module

When the module's **Acceptance criteria** all pass:

1. Fill in the module's **Handoff** subsection with everything downstream modules need (addresses, URLs, env vars, file paths).
2. Fill in the module's **Notes** subsection with: what was actually built vs planned, deviations, gotchas encountered, anything the next module needs to know.
3. Change the module's **Status** in the status board to `complete`.
4. Commit: `plan: mark module N complete`.
5. Stop. Ask the human whether to start the next module.

### When pivoting

Per the rules in PLAN.md, if you must drop scope:

1. Tell the human first, explain the trigger, propose the pivot.
2. On confirmation, update the affected module's content in PLAN.md to reflect the new scope.
3. Append an entry to the **Pivot Log** at the bottom of PLAN.md with timestamp, trigger, change, downstream impact.
4. Commit: `plan: pivot module N — <one-line reason>`.

## Circle skills are installed

Before touching anything Circle- or Arc-related, **use the installed Circle skills**. They are authoritative and current. Do not guess at contract addresses, RPC endpoints, or SDK shapes.

Relevant skills:
- `use-arc` — chain config, RPC, deployment, gas with USDC
- `use-usdc` — USDC interface, decimals, transfer patterns
- `use-modular-wallets` — embedded wallets for the frontend
- `use-smart-contract-platform` — Circle's deploy/manage flow if you use it instead of raw Foundry
- `use-gateway` — for cross-chain USDC deposits (stretch goal)

The Arc MCP server is also connected — use it to look up live Arc docs when in doubt.

## Arc Testnet quick facts

These are the values you will use everywhere. Do not look them up again.

| What | Value |
|---|---|
| Chain ID | `5042002` |
| RPC HTTPS | `https://rpc.testnet.arc.network` |
| RPC WSS | `wss://rpc.testnet.arc.network` |
| Explorer | `https://testnet.arcscan.app` |
| Faucet | `https://faucet.circle.com` |
| USDC (ERC-20 interface) | `0x3600000000000000000000000000000000000000` — **6 decimals** for ERC-20 ops |
| USDC native gas decimals | 18 (do not mix with the 6-decimal ERC-20 view) |
| Min `maxFeePerGas` | 20 Gwei |
| Permit2 | `0x000000000022D473030F116dDEE9F6B43aC78BA3` |
| Multicall3 | `0xcA11bde05977b3631167028862bE2a173976CA11` |

**USDC decimals gotcha:** native gas accounting uses 18 decimals, ERC-20 interface uses 6. Same underlying balance. For all application-level code (transfers, balances, bet amounts), use the **6-decimal ERC-20 interface**. Never hardcode `1e18` for "1 USDC" in app code — use `1e6` or read `decimals()`.

## Repo layout

```
/
├── PLAN.md           # Living source of truth — read at every session start
├── CLAUDE.md         # This file — workflow rules and conventions
├── README.md         # User-facing README (write near submission time)
├── contracts/        # Module 1 — Foundry, Solidity 0.8.24
├── agent/            # Modules 2 + 3 — Python 3.11+, agent + demo API
├── web/              # Modules 4 + 5 — Next.js 14, TypeScript, viem
├── bot/              # Module 6 — Python, Telegram/Twitter poster
└── infra/            # Module 7 — Makefile + deploy scripts
```

## Conventions (apply across all modules)

### General

- Branches per module: `feat/contracts`, `feat/agent`, `feat/web-feed`, `feat/web-demo`, `feat/bot`, etc. Merge to `main` when the module is green.
- Commit often. Conventional commits: `feat(scope): ...`, `fix(scope): ...`, `test(scope): ...`, `plan: ...` for PLAN.md updates.
- No premature abstraction. Second use case justifies extraction; first does not.
- Log everything in the agent. Structured logs (JSON) so we can grep post-hoc.

### Solidity (`contracts/`)

- Solidity `0.8.24`. Match across all contracts.
- Foundry. No Hardhat. Tests in `test/`, deploys in `script/`.
- `forge fmt` before every commit.
- USDC transfers use `IERC20(USDC).transferFrom(...)`. No `SafeERC20` wrapper.
- Custom errors, not `require(..., "string")`.
- All amounts in storage are **6-decimal USDC**. Document this in every relevant function comment.
- Events emit all params the frontend needs to render — never force the frontend into read-loops.

### Python (`agent/`, `bot/`)

- Python 3.11+. Use `uv` if available, else `venv` + `pip`.
- `pyproject.toml`, not `setup.py` or `requirements.txt` alone.
- `ruff` for lint + format. Run before commits.
- Async-first for collectors (`asyncio` + `aiohttp`).
- Type hints everywhere. `from __future__ import annotations` at top of every file.
- Dataclasses or Pydantic for structured data, never raw dicts crossing module boundaries.
- `python-dotenv` for local config. Never commit `.env`. Always provide `.env.example`.
- Required deps for cross-cutting concerns: `cachetools` (TTL cache), `tenacity` (retry), `structlog` (JSON logs), `fastapi` + `uvicorn` (demo API + health), `aiosqlite` (idempotency state).

### TypeScript (`web/`)

- Next.js 14 App Router. Not Pages Router.
- **viem**, not ethers. Smaller, faster, matches Arc docs examples.
- Tailwind. No CSS modules, no styled-components.
- `tsconfig` strict mode on.
- Server Components by default; mark client components explicitly with `"use client"`.
- Read on-chain data via events (`watchEvent`, `getLogs`). Do not poll view functions when an event path exists.
- The `TraceViewer` component is the demo's hero UI — invest extra polish there.

## Environment variables (canonical list)

Maintain `.env.example` in each module. As you add a var, add it here too.

### `agent/.env`

```
ARC_RPC_URL=https://rpc.testnet.arc.network
ARC_CHAIN_ID=5042002
AGENT_PRIVATE_KEY=0x...                # signs trace JSONs + sends txs
USDC_ADDRESS=0x3600000000000000000000000000000000000000
MARKET_REGISTRY_ADDRESS=0x...          # populated after Module 1 deploy
TRACE_REGISTRY_ADDRESS=0x...           # populated after Module 1 deploy
GROQ_API_KEY=gsk_...
GROQ_MODEL=qwen/qwen3-32b                  # optional; defaults to qwen/qwen3-32b
IPFS_PROVIDER=pinata
PINATA_JWT=...
NFI_REPO=iterativv/NostalgiaForInfinity
NFI_BLACKLIST_PATH=...                 # set after inspecting repo structure
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
DEMO_API_PORT=8787
DEMO_API_HOST=127.0.0.1
DEMO_API_SECRET=x9k2vp4z              # path obscurity suffix for demo endpoint
LOG_LEVEL=INFO
```

### `web/.env.local`

```
NEXT_PUBLIC_ARC_RPC_URL=https://rpc.testnet.arc.network
NEXT_PUBLIC_ARC_WSS_URL=wss://rpc.testnet.arc.network
NEXT_PUBLIC_ARC_CHAIN_ID=5042002
NEXT_PUBLIC_USDC_ADDRESS=0x3600000000000000000000000000000000000000
NEXT_PUBLIC_MARKET_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_TRACE_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_AGENT_ADDRESS=0x...
NEXT_PUBLIC_EXPLORER_URL=https://testnet.arcscan.app
NEXT_PUBLIC_IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs/
NEXT_PUBLIC_AGENT_DEMO_URL=http://localhost:8787
NEXT_PUBLIC_DEMO_API_SECRET=x9k2vp4z   # must match agent's DEMO_API_SECRET
CIRCLE_MODULAR_WALLETS_APP_ID=...
```

### `bot/.env`

```
ARC_WSS_URL=wss://rpc.testnet.arc.network
MARKET_REGISTRY_ADDRESS=0x...
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
TWITTER_API_KEY=...                     # optional, if budget allows
TWITTER_API_SECRET=...
TWITTER_ACCESS_TOKEN=...
TWITTER_ACCESS_SECRET=...
WEB_BASE_URL=https://...
```

## Gotchas

Things that will bite. Address proactively.

1. **USDC decimals.** 6 for app-level, 18 for native gas. ERC-20 interface for everything except gas estimation.
2. **`maxFeePerGas` floor.** Set to at least `20 Gwei`. Lower = tx sits in mempool forever.
3. **WebSocket disconnects.** Wrap all WSS subscriptions in reconnect loops with exponential backoff. Affects bot and frontend event watcher.
4. **NFI blacklist format may change.** Defensive parsing; log unrecognized lines instead of crashing.
5. **Solana public RPC rate limits.** Get a Helius free key on day 1; cache aggressively; poll conservatively.
6. **Resolution timestamps.** All on-chain timestamps are unix UTC. Display via `Intl.DateTimeFormat`. Test with non-UTC system clock at least once.
7. **Constant-product zero pools.** Seed each market constructor with initial liquidity (e.g. 1 USDC on each side) so first-bet pricing isn't div-by-zero.
8. **Trace JSON canonicalization.** Agent and frontend must compute the same hash. Use canonicalized JSON (sorted keys, no whitespace). Implement a tiny canonicalizer or use a JCS library.
9. **Wallet UX.** Don't show both Modular Wallets + MetaMask at once. Pick one primary; the other behind "advanced" if at all.
10. **IPFS gateway warm-up.** Pinata pins are fast but the public gateway may take 30+s to serve a new CID. Warm with a `fetch` after pinning, before recording on-chain.
11. **GitHub API rate limits for the demo loader.** Use ETag-based caching, persist between agent restarts. Anonymous rate limit is 60/hr.
12. **Demo API CORS.** The frontend at a Vercel URL needs to call the agent at a different host. Set CORS on the FastAPI demo app to allow the frontend origin.

## When to ask the human

**Default: keep working, do not block.**

**Interrupt for:**
- About to pivot per PLAN.md's pivot rules
- A contract change requiring redeploy after addresses are already wired downstream
- A scope decision that materially changes the schedule
- A non-obvious tradeoff (e.g. "Twitter is paid, Telegram is free, which?")
- Code that would contradict PLAN.md
- Finishing a module (always confirm before starting the next)

**Don't interrupt for:**
- Naming, styling, helper library choice
- Test coverage decisions within the module
- Commit messages
- Routine debugging

## Definition of done per module

A module is `complete` when:

- All listed acceptance criteria in PLAN.md are met
- **All boxes in that module's Cross-cutting checklist are ticked** (in PLAN.md, under the module section)
- Tests (where applicable) pass
- A README in the module directory explains how to run it from scratch
- It's been verified end-to-end against actual Arc Testnet, not just unit tests
- Env vars are documented in this file and in the module's `.env.example`
- **Handoff** and **Notes** sections in PLAN.md are filled in
- Status board in PLAN.md updated to `complete`
- A commit `plan: mark module N complete` exists

## What "shipping" looks like (Module 8 details)

The hackathon submission requires:

- Public GitHub repo (this one)
- 2.5-minute Loom video walkthrough
- Live URL (deployed frontend on Vercel)
- Written traction summary

When the human says "ship" or "finalize," do all of:
1. Verify `main` is green
2. Confirm contracts are deployed; addresses in env vars across all modules
3. Confirm agent is running on the deployment host
4. Confirm bot is running and posting
5. Confirm frontend deploys live on Vercel
6. Update root `README.md` with: one-paragraph pitch, architecture diagram, contract addresses with explorer links, video link, live URL, "how to run locally"
7. Record video per the script in PLAN.md Module 8
8. Submit the form