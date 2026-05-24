# PLAN.md — RugOracle

> **This is a living document.** Claude reads it at the start of every session to pick the next module to work on, and updates the relevant module's "Status" and "Notes" sections when the module is complete. Humans read it to see what's done and what's next.

A prediction market vertical on Arc where binary markets ("will [TOKEN] lose >50% in 7 days?") are minted autonomously by an AI agent that watches multiple rugpull signal sources in real time. Built for the Circle / Arc hackathon. Targets RFB 03 (Prediction Market Verticals) with elements of RFB 02 baked in.

Working name: **RugOracle**. Rename later if a better one lands.

---

## How to use this document

**At the start of every session, Claude should:**
1. Read this entire file
2. Find the next module whose **Status** is `not_started` or `in_progress` and whose dependencies are `complete`
3. Confirm with the human which module to work on (default to the next eligible one)
4. Work only on that module — do not silently start other modules

**At the end of every module, Claude should:**
1. Update that module's **Status** to `complete`
2. Fill in the **Notes** subsection with: what was actually built, deviations from the plan, gotchas hit, and anything the next module needs to know
3. If contract addresses, env vars, or anything else downstream modules need was produced, write it into the **Handoff** subsection
4. Commit the doc with a message like `plan: mark <module> complete`

**When pivoting:**
1. Log the pivot in the **Pivot Log** at the bottom with timestamp, reason, what changed
2. Update the affected module's plan if scope changed

**Commit cadence:**
- Commit every 15–20 minutes minimum. Every passing test, every small chunk of working code.
- If you find yourself thinking "let me get this whole thing working first," stop and commit what works now.
- Recovery cost of a broken state is bounded by your last commit. Aim for "lose 20 minutes max" not "lose 2 hours."

---

## Cross-cutting concerns

These patterns apply across every module. Implement them in the order they're listed when each module first needs them — do not bolt on at the end.

### Caching (`agent/agent/cache.py`)

Single TTL cache used by every external call.

```python
# agent/agent/cache.py
from cachetools import TTLCache
from functools import wraps
import asyncio
import hashlib
import json

# Per-source caches with sensible TTLs
caches = {
    "jupiter": TTLCache(maxsize=500, ttl=30),
    "dexscreener": TTLCache(maxsize=500, ttl=60),
    "github_blob": TTLCache(maxsize=100, ttl=300),
    "github_api": TTLCache(maxsize=200, ttl=300),
    "solana_rpc": TTLCache(maxsize=500, ttl=30),
}

def cached(source: str):
    """Decorator: cache async function result keyed by args."""
    def decorator(fn):
        @wraps(fn)
        async def wrapper(*args, **kwargs):
            key = hashlib.sha256(
                json.dumps([args, kwargs], default=str, sort_keys=True).encode()
            ).hexdigest()
            cache = caches[source]
            if key in cache:
                return cache[key]
            result = await fn(*args, **kwargs)
            cache[key] = result
            return result
        return wrapper
    return decorator
```

Every collector and every DEX price fetcher uses this. GitHub fetches additionally respect ETags (see Module 3).

### Idempotency (`agent/agent/state.py`)

SQLite tracking of in-flight market mints. Prevents duplicate markets on agent restart.

Schema:
```sql
CREATE TABLE mints (
    signal_id TEXT PRIMARY KEY,
    token_id TEXT NOT NULL,
    status TEXT NOT NULL,  -- 'pending_ipfs' | 'pending_chain' | 'pending_trace' | 'complete' | 'failed'
    ipfs_cid TEXT,
    market_address TEXT,
    create_tx_hash TEXT,
    trace_tx_hash TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    error TEXT
);

CREATE INDEX idx_mints_status ON mints(status);
```

On agent startup, `state.reconcile()` walks any `pending_*` rows and either resumes or marks failed. The executor wraps every mint in a state-transition with explicit status updates between steps.

### Nonce management (`agent/agent/nonce.py`)

Local nonce counter, sync from chain on init and on certain errors.

```python
class NonceManager:
    def __init__(self, w3, address):
        self.w3 = w3
        self.address = address
        self._nonce = None
        self._lock = asyncio.Lock()

    async def next(self) -> int:
        async with self._lock:
            if self._nonce is None:
                self._nonce = await self.w3.eth.get_transaction_count(self.address, "pending")
            current = self._nonce
            self._nonce += 1
            return current

    async def resync(self):
        async with self._lock:
            self._nonce = await self.w3.eth.get_transaction_count(self.address, "pending")
```

Resync on "nonce too low" or "nonce too high" errors. Every tx send goes through this.

### RPC retry (`agent/agent/chain.py`)

Wrap all RPC calls with `tenacity`:

```python
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

@retry(
    stop=stop_after_attempt(5),
    wait=wait_exponential(multiplier=1, min=1, max=10),
    retry=retry_if_exception_type((ConnectionError, TimeoutError, Web3RPCError)),
)
async def call_rpc(...):
    ...
```

Same pattern in the frontend with viem (use a wrapper around `publicClient` that retries on network errors).

### Structured logging (`agent/agent/logging.py`)

Every signal gets a `signal_id` (uuid4) at ingestion; it propagates through scorer → reasoner → executor → chain tx → trace. Logs are JSON with the id in context.

```python
import structlog

log = structlog.get_logger()
# In handler:
bound = log.bind(signal_id=sig.id, token=sig.token_symbol)
bound.info("scoring", score=score)
bound.info("reasoning_complete", verdict=verdict)
bound.info("market_minted", address=market_addr, tx=tx_hash)
```

Grepping `signal_id=abc123` shows the whole path. Frontend errors get the same treatment with a `correlation_id` query param when calling the demo API.

### Health endpoints

Both agent and bot expose `GET /health`:

```json
{
  "status": "ok",
  "uptime_seconds": 1234,
  "last_signal_seen_at": "2026-05-24T10:00:00Z",
  "last_market_minted_at": "2026-05-24T10:05:00Z",
  "last_market_address": "0x...",
  "in_flight_mints": 0,
  "errors_last_hour": 0
}
```

Frontend has a small "system status" footer that polls these every 30s and shows red/yellow/green.

### Event log pagination (frontend)

On feed page load, paginate historical events via `getLogs` in chunks of 1000 blocks:

```typescript
async function getAllMarkets() {
  const latest = await client.getBlockNumber();
  const chunks = [];
  for (let from = DEPLOY_BLOCK; from < latest; from += 1000n) {
    const to = from + 999n > latest ? latest : from + 999n;
    chunks.push(client.getLogs({ address: REGISTRY, event: MARKET_CREATED, fromBlock: from, toBlock: to }));
  }
  return (await Promise.all(chunks)).flat();
}
```

Then attach a live `watchEvent` subscription for new ones. Cache the historical result in `sessionStorage` keyed by latest block so reloads are fast.

### ABI single source of truth

After contract deploy, `make abis` exports compiled artifacts from `contracts/out/` and copies the relevant ABIs to `agent/agent/abis/` and `web/src/lib/abis/`. Never hand-edit ABIs in either place — re-run the make target.

### Optimistic UI on bets

When user clicks Bet:
1. Immediately add a pending position card with spinner
2. Send tx
3. On confirm (1 second on Arc), flip pending → confirmed
4. On revert, remove with red toast

The 1-second finality makes this feel instant rather than fake.

### Error boundaries (frontend)

Wrap `MarketCard`, `TraceViewer`, `BetSheet` in React error boundaries. One broken IPFS fetch must not blank-screen the feed.

### Mobile-responsive

The `/demo` and `/m/[address]` pages especially must work on mobile — they'll be the shared URLs. Tailwind makes this near-free if you start with mobile classes and add `sm:` / `md:` overrides.

### Demo API security

The demo endpoint mints real on-chain markets and costs gas, so it's an abuse vector. Mitigations for v1:
- Path obscurity: `/demo-x9k2/inject` not `/demo/inject`
- The path suffix is in `DEMO_API_SECRET` env var, frontend reads it from `NEXT_PUBLIC_DEMO_API_SECRET`
- Simple in-memory rate limit: 10 mints per IP per hour using `cachetools` (no Redis)
- CORS allowlist: only the deployed frontend origin

### Don't do these

Explicitly skipped to protect schedule:
- Full database (SQLite for state only)
- Redis / external message bus (in-process asyncio.Queue is plenty)
- Backend auth (no auth surface — wallet sigs only)
- CI/CD beyond test runs (deploy from laptop via `make`)
- Grafana / Prometheus (logs + health endpoints + `make status` curl script)
- Comprehensive test coverage (Solidity happy paths + scorer + canonical hasher only)
- Conventional changelogs, semver, releases
- Dependency auto-update tooling

---

## Pitch (one paragraph)

Memecoin rugs happen every day, and the people best at spotting them — like `iterativv`, maintainer of NostalgiaForInfinity (3.2k stars, the leading public Freqtrade strategy) — already publish their work as plaintext blacklist commits on GitHub. RugOracle parses that feed alongside on-chain liquidity signals and DEX price anomalies, scores each flagged token, and autonomously mints a binary prediction market on Arc within seconds of detection. Markets resolve from a public DEX price oracle 7 days later. Users bet in USDC with embedded wallets and sponsored gas; the agent's reasoning trace for every market is hashed on Arc and pinned for verifiability. Sub-second Arc finality is core to the product because the signal front-runs the rug — the market needs to be live before the price collapses.

---

## Rubric mapping (why this wins)

- **Agentic sophistication (30%)** — Multi-signal fusion, weighted scoring, LLM-generated reasoning trace, autonomous market parameter selection, autonomous resolution. Real synthesis and judgment.
- **Traction (30%)** — Binary, low-stakes, no-deposit, gasless bets. One-click flow. Twitter/Telegram bot auto-posts every minted market = inherently shareable content.
- **Circle tools (20%)** — USDC, Wallets (Modular), Paymaster, Smart Contract Platform, Gateway, USYC in pitch. Six primitives, all natural to the product.
- **Innovation (20%)** — A prediction market vertical that does not exist. The "human-maintainer-as-oracle" pattern + published reasoning traces + signal-fusion market creation is genuinely new.

---

## Architecture overview

Four planes:

1. **Signal plane** — Collectors pull from external sources. One process per source. Emit `Signal` events to a shared bus.
2. **Agent plane** — Subscribes to the bus. Scores → decides → generates reasoning trace → pins to IPFS → mints market on Arc.
3. **Chain plane** — Three contracts on Arc Testnet (`MarketRegistry`, `BinaryMarket`, `TraceRegistry`). Optional ERC-8004 agent identity.
4. **Distribution plane** — Next.js frontend with embedded wallets + Paymaster, plus a Twitter/Telegram bot that posts each new market.

```
   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
   │ GitHub NFI   │  │ Solana DEX   │  │ BSC DEX      │  │ DEMO INJECT  │
   │ collector    │  │ collector    │  │ collector    │  │ (manual btn) │
   └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
          │                 │                 │                 │
          └─────────────────┴────┬────────────┴─────────────────┘
                                 │ Signal events
                                 ▼
                          ┌──────────────┐
                          │ Agent (LLM)  │ ─── pin trace ──▶ IPFS
                          │ score+decide │
                          └──────┬───────┘
                                 │ createMarket(token, params, traceHash)
                                 ▼
   ┌─────────────────────── Arc Testnet ───────────────────────┐
   │  MarketRegistry  ◀── deploys ──  BinaryMarket (per token) │
   │  TraceRegistry   ◀── stores  ──  trace hash + signature   │
   │  AgentIdentity (ERC-8004)                                  │
   └────────────────────────────────────────────────────────────┘
                                 ▲
                                 │ bet / claim / resolve
                          ┌──────┴───────┐
                          │  Next.js     │ ─── Circle Modular Wallets
                          │  frontend    │ ─── Paymaster (gasless)
                          │  + /demo pg  │ ─── manual signal injection
                          └──────┬───────┘
                                 │
                          ┌──────┴───────┐
                          │ Twitter/TG   │ posts every new market
                          └──────────────┘
```

---

## Module status board

| # | Module | Status | Depends on |
|---|--------|--------|------------|
| 1 | `contracts/` — Solidity on Arc | `complete` | — |
| 2 | `agent/` — Python agent + collectors | `complete` | 1 |
| 3 | `agent/demo` — manual signal injection endpoint | `complete` | 2 |
| 4 | `web/` — Next.js frontend | `complete` | 1 (and 2 for live data) |
| 5 | `web/demo` — demo trigger button UI | `in_progress` | 3, 4 |
| 6 | `bot/` — Twitter/Telegram poster | `not_started` | 1 |
| 7 | `infra/` — deploy + run scripts | `not_started` | all |
| 8 | `submission` — video, README, form | `not_started` | all |

**Status values:** `not_started` | `in_progress` | `complete` | `blocked` | `skipped`

---

# Module 1 — `contracts/`

**Status:** `complete`

**Purpose.** On-chain market protocol. Three small contracts, all auditable in one sitting.

**Stack.** Foundry, Solidity 0.8.24, Arc Testnet (chain ID `5042002`, RPC `https://rpc.testnet.arc.network`). USDC ERC-20 at `0x3600000000000000000000000000000000000000` (6 decimals at application level).

### Contracts to build

#### `BinaryMarket.sol`
Single market: "Will `token` lose >`thresholdBps` bps of its value within `duration` seconds from `baselinePrice`?"

State:
- `bytes32 tokenId` — address packed; bytes32 supports Solana base58 addresses too
- `string tokenChain` — `"solana"` | `"bsc"` | `"base"` | `"ethereum"`
- `string tokenSymbol` — display only
- `uint256 baselinePrice` — captured at creation, 8-decimal precision USD
- `uint256 thresholdBps` — typically 5000 (50%)
- `uint256 createdAt`, `uint256 resolvesAt`, `uint256 bettingClosesAt` (= resolvesAt - 1h)
- `bytes32 traceHash` — pointer into `TraceRegistry`
- `uint256 yesPool`, `uint256 noPool` — USDC pools (6 decimals)
- `mapping(address => uint256) yesShares`, `noShares`
- `enum State { Open, Resolved, Cancelled }`
- `bool resolvedYes`

Functions:
- `constructor(...)` — called by `MarketRegistry`, seeds with initial liquidity passed in
- `bet(bool yes, uint256 amount)` — USDC transferFrom, mints shares via constant-product
- `resolve(bool yes)` — only resolver address, stores outcome
- `claim()` — winners pull stake + share of losing pool
- `cancelIfUnresolved()` — anyone can call if 24h past `resolvesAt` with no resolution; refunds proportionally

Pricing: constant product. `shares = amount * sharesPool / (otherPool + amount)`. Skip LMSR (complexity not worth it for binary).

Constructor takes initial liquidity in USDC (e.g. 2 USDC, 1 on each side) so first-bet pricing isn't a div-by-zero edge case.

#### `MarketRegistry.sol`
Factory + index. Only `agent` can mint markets.

Functions:
- `createMarket(bytes32 tokenId, string tokenChain, string tokenSymbol, uint256 baselinePrice, uint256 thresholdBps, uint256 duration, bytes32 traceHash, uint256 initialLiquidity)` — agent only, deploys `BinaryMarket`, emits `MarketCreated`
- `setAgent(address)`, `setResolver(address)` — owner only
- `getMarkets()`, `getMarketsByToken(bytes32 tokenId)`

Event `MarketCreated` includes everything the frontend needs to render a card without a follow-up RPC call.

#### `TraceRegistry.sol`
`bytes32 traceHash → (string ipfsCid, bytes signature, uint256 timestamp)`. Agent records, anyone reads.

#### Optional: ERC-8004 agent registration
One-time call at deploy. Cheap, narratively valuable. Skip if behind schedule.

### Conventions

- Custom errors, not require-strings
- All amounts in storage are **6-decimal USDC**
- Events carry all params; no read-loops needed from the frontend
- `forge fmt` before every commit
- No `SafeERC20` (USDC is well-behaved on Arc, saves bytes)

### Tests (minimum)
- Bet on each side mints correct shares
- Multiple bets per user accumulate
- Bet after `bettingClosesAt` reverts
- Resolve by non-resolver reverts
- Double resolve reverts
- Claim before resolve reverts
- Claim after resolve pays the right amount on winning side, zero on losing
- `cancelIfUnresolved` after grace period refunds proportionally

### Files
```
contracts/
├── foundry.toml
├── src/
│   ├── BinaryMarket.sol
│   ├── MarketRegistry.sol
│   └── TraceRegistry.sol
├── test/
│   ├── BinaryMarket.t.sol
│   └── MarketRegistry.t.sol
├── script/
│   └── Deploy.s.sol
└── README.md
```

### Acceptance criteria
- All listed tests pass under `forge test`
- Contracts deploy cleanly to Arc Testnet via `forge script script/Deploy.s.sol --rpc-url $ARC_RPC --broadcast`
- Addresses written to `infra/deployed.json`
- ABIs exported to `agent/agent/abis/` and `web/src/lib/abis/`

### Handoff (filled when complete)

- `MarketRegistry` address: `0xa1Db4fBe80E7064E8bC70b6138a11572cFE1f79b`
- `TraceRegistry` address: `0x614A1F64395FD1b925E347AC13812CC48b62f5B7`
- Deployer / agent address: `0xe34b40f38217f9Dc8c3534735f7f41B2cDA73A75`
- Resolver address: `0xe34b40f38217f9Dc8c3534735f7f41B2cDA73A75` (same as agent for now)
- ABI export paths: `agent/agent/abis/`, `web/src/lib/abis/`
- Full deploy record: `infra/deployed.json`

### Notes (filled when complete)

- `via_ir = true` required in `foundry.toml` — `createMarket` has too many stack vars without it.
- BinaryMarket does NOT pull USDC in constructor; MarketRegistry seeds it via `transfer` after deploy. This avoids the impossible pre-approve-unknown-address problem.
- Agent + resolver are the same wallet for v1; can be split later via `setAgent`/`setResolver`.
- `refund()` separate from `claim()` — only callable when `State.Cancelled`.
- All 21 tests pass under `forge test`.

---

# Module 2 — `agent/`

**Status:** `complete` · **Depends on:** Module 1

**Purpose.** Continuously watch signal sources; on each new signal, decide whether to mint a market.

**Stack.** Python 3.11+, `anthropic` SDK, `web3.py`, `aiohttp`, `eth-account` for signing, in-process pub-sub (no Redis).

### Submodules

#### `agent/collectors/`
One file per signal source. Each is an async generator yielding `Signal` objects.

```python
@dataclass
class Signal:
    source: str          # "nfi_blacklist" | "price_anomaly" | "manual_demo"
    token_id: bytes      # canonical address bytes
    token_chain: str     # "solana" | "bsc" | "ethereum"
    token_symbol: str
    severity: float      # 0.0 to 1.0
    raw_data: dict
    timestamp: int
```

**Collectors to ship (priority order):**

1. **`nfi_blacklist.py`** — Poll `https://raw.githubusercontent.com/iterativv/NostalgiaForInfinity/main/<blacklist_path>` every 60s. **The exact blacklist file path needs to be looked up at build time** — the repo has X6 and X7 strategies with potentially different blacklist files. Inspect the repo first, then set `NFI_BLACKLIST_PATH` env var. Diff against last known set. New addition → emit Signal with `severity=0.9`. Symbol-to-address mapping uses a hardcoded JSON file (`agent/agent/data/symbol_map.json`) for v1, populated with the 20-50 most-watched memecoins. Tokens we can't map are logged but skipped.

2. **`price_anomaly.py`** — For tokens on a watchlist (anything mentioned by any other collector in the last 7 days), poll DEX price every 5 min. Solana uses Jupiter (`https://price.jup.ag/v6/price?ids=<mint>`), BSC uses Dexscreener (`https://api.dexscreener.com/latest/dex/tokens/<addr>`). Sudden >20% drop in 1h → Signal with severity proportional to drop magnitude.

3. **`solana_lp.py`** *(stretch — skip if behind by hour 14)* — Watch Raydium/Pump.fun LPs for >30% withdrawals in 1h.

#### `agent/scorer.py`
```python
def score_token(signals: list[Signal]) -> tuple[float, list[Signal]]:
    """Return (score, contributing_signals). Score >= 0.6 triggers a market."""
```
Weights: NFI 0.5, price anomaly 0.3, LP drop 0.2, manual_demo 1.0 (bypass threshold).

#### `agent/reasoner.py`
Anthropic SDK call with structured output prompt. Returns JSON:
```json
{
  "verdict": "open_market" | "monitor" | "ignore",
  "confidence": 0.0-1.0,
  "rationale": "...",
  "market_params": {
    "threshold_bps": 5000,
    "duration_hours": 168,
    "initial_liquidity_usdc": 2
  },
  "evidence_summary": [
    {"source": "...", "summary": "...", "weight": ...}
  ]
}
```
This output **is** the reasoning trace. Canonicalize (sorted keys, no whitespace), `sha256()`, pin canonical JSON to IPFS, sign hash with `AGENT_PRIVATE_KEY`.

#### `agent/executor.py`
1. Fetch current baseline price from DEX
2. Call `MarketRegistry.createMarket(...)` with params + traceHash
3. Call `TraceRegistry.recordTrace(hash, ipfsCid, signature)`
4. Return deployed market address

#### `agent/resolver.py`
Background loop, runs every 10 min. Reads `MarketRegistry.getMarkets()`, filters expired open markets, pulls current DEX price, computes outcome, calls `BinaryMarket.resolve(...)`.

#### `agent/main.py`
Orchestrator. Spawns collectors, subscribes to bus, runs scorer → reasoner → executor on each signal. Resolver runs as background task.

#### `agent/ipfs.py`
Pinata wrapper. Function `pin_json(obj: dict) -> str` returns CID. Warm public gateway with a fetch immediately after pinning so it's hot when the frontend asks.

#### `agent/chain.py`
web3.py setup: provider, signed account, contract loaders. Handles the 20 Gwei min `maxFeePerGas` floor.

### Files
```
agent/
├── pyproject.toml
├── .env.example
├── agent/
│   ├── __init__.py
│   ├── main.py
│   ├── bus.py
│   ├── models.py
│   ├── chain.py              # + tenacity retry on RPC calls
│   ├── cache.py              # cross-cutting: TTL cache + @cached decorator
│   ├── state.py              # cross-cutting: SQLite mint idempotency
│   ├── nonce.py              # cross-cutting: NonceManager
│   ├── logging.py            # cross-cutting: structlog config
│   ├── health.py             # cross-cutting: /health endpoint
│   ├── ipfs.py
│   ├── scorer.py
│   ├── reasoner.py
│   ├── executor.py           # uses state.py transitions
│   ├── resolver.py
│   ├── abis/                 # populated by `make abis`
│   ├── data/
│   │   └── symbol_map.json
│   └── collectors/
│       ├── __init__.py
│       ├── nfi_blacklist.py  # uses @cached("github_blob")
│       ├── price_anomaly.py  # uses @cached("jupiter") / @cached("dexscreener")
│       └── solana_lp.py
├── tests/
│   ├── test_scorer.py        # scorer logic is worth covering
│   ├── test_canonical.py     # canonical JSON hasher correctness
│   └── test_state.py         # reconciliation paths
└── README.md
```

### Acceptance criteria
- `python -m agent.main` connects to Arc Testnet, logs "watching N collectors", runs indefinitely
- Injecting a fake signal (via Module 3) causes a market to deploy on Arc Testnet
- Trace is pinned to IPFS and recorded in `TraceRegistry` with valid signature
- Resolver successfully resolves an expired test market

### Cross-cutting checklist (must be true before marking complete)
- [x] `cache.py` exists; all DEX and GitHub calls in collectors use the `@cached` decorator
- [x] `state.py` SQLite schema created; executor wraps mints in state transitions
- [x] `nonce.py` NonceManager used on every chain tx; resync on nonce errors works
- [x] `chain.py` RPC calls wrapped with tenacity retry
- [x] `logging.py` structlog setup; every signal carries a `signal_id` through scoring → reasoning → execution
- [x] `GET /health` endpoint live on agent (separate from demo API or on same FastAPI app)
- [x] On restart with an in-flight mint row, agent reconciles correctly (test by killing mid-mint)

### Handoff (filled when complete)
- Agent wallet address: `0xe34b40f38217f9Dc8c3534735f7f41B2cDA73A75`
- IPFS provider and base gateway: Pinata / `https://gateway.pinata.cloud/ipfs/`
- Sample minted market address: `0x181A752Af947dE00529CFDE58324e8C2D0667552` (BLUME2E e2e test)
- Health endpoint URL: `http://127.0.0.1:8787/health` (configurable via `DEMO_API_HOST`/`DEMO_API_PORT`)

### Notes (filled when complete)
- LLM swapped Anthropic → Groq (`qwen/qwen3-32b`). Set `GROQ_API_KEY` in `.env`.
- NFI blacklist format is FreqTrade JSON (`configs/blacklist-*.json`), not a Python file. Parser strips JS-style `//` comments before JSON decode, then extracts symbols from `(SYM1|SYM2|...)/.*` patterns. Live: 395 symbols detected including BLUM.
- `_fetch_raw` is cached with `@cached("github_blob")` (300s TTL). On high-frequency polls the same URL will be served from cache, which means diff detection fires only once per TTL window — acceptable for v1.
- `executor.py` calls `approve` on USDC before `createMarket`. The registry pulls the 2 USDC seed via `transferFrom` internally.
- Trace gateway warm-up (Pinata) occasionally fires a duplicate log line; benign.
- `solana_lp.py` skipped (stretch goal). Price watchlist is in-process; tokens are added when any collector emits a signal for them.

---

# Module 3 — `agent/demo` — manual signal injection

**Status:** `complete` · **Depends on:** Module 2

**Purpose.** Demo button that fires a signal into the bus on demand, so the demo video doesn't depend on iterativv pushing a commit during recording. The button picks from a **list of real recent additions** to the NFI blacklist (pre-fetched) so the demo is authentic, not fake.

### How it works

The agent exposes a small HTTP server (FastAPI, port 8787, localhost-only by default) with two endpoints:

#### `GET /demo/candidates`
Returns a list of real, recent NFI blacklist additions:
```json
{
  "candidates": [
    {
      "id": "abc123",
      "symbol": "BLUM",
      "chain": "bsc",
      "token_id": "0x...",
      "added_in_commit": "8f5e8d6...",
      "added_at": "2026-05-12T14:23:00Z",
      "commit_url": "https://github.com/iterativv/NostalgiaForInfinity/commit/8f5e8d6...",
      "summary": "iterativv added BLUM to the X7 blacklist"
    },
    ...
  ]
}
```

These are real entries pulled from the NFI git history at build time and cached in `agent/agent/data/demo_candidates.json`. On agent startup, refresh the cache from GitHub (last 30 days of blacklist additions). 6–10 candidates is the sweet spot — enough to feel real, few enough to fit on a button row.

#### `POST /demo/inject`
Body: `{"candidate_id": "abc123"}`
Effect: emits a `Signal` to the bus exactly as if `nfi_blacklist.py` had just seen it. Includes a `"manual_demo": true` flag in `raw_data` so the resulting trace can be marked as demo-injected (don't hide this — judges respect the honesty).

The agent processes it like any real signal: scores it, reasons about it, mints a market.

### Why pick from real candidates rather than fake input

- Demo feels authentic: "I'm picking BLUM, which iterativv actually blacklisted on May 12, here's the commit link"
- The agent's reasoning trace makes sense because the token is real and the signal severity is the same as production
- Judges can verify the commit exists on GitHub
- Avoids the awkwardness of "we're simulating a hypothetical token"

### Files
```
agent/agent/
├── demo_api.py              # FastAPI app
├── demo_loader.py           # fetches recent blacklist commits from GitHub
└── data/
    └── demo_candidates.json # refreshed on agent startup
```

`main.py` spawns the FastAPI server as a background task.

### Acceptance criteria
- `GET http://localhost:8787/demo/candidates` returns ≥5 real candidates
- `POST http://localhost:8787/demo/inject` with a valid id produces a minted market within ~10 seconds
- Demo-injected markets are recorded with `"manual_demo": true` in the reasoning trace
- The demo loader gracefully handles GitHub API rate limits (use ETag caching, store in `agent/agent/data/github_cache.json`)

### Cross-cutting checklist
- [x] Demo path includes `DEMO_API_SECRET` obscurity suffix (`/demo-<secret>/inject`)
- [x] In-memory rate limit: 10 mints per IP per hour
- [x] CORS allowlist restricted to the deployed frontend origin
- [x] GitHub fetches use ETags via `cache.py` + persistent ETag store in `github_cache.json`
- [x] Endpoint shares the agent's `signal_id` logging so demo injections are traceable in logs

### Handoff (filled when complete)
- Demo API port and path: `http://127.0.0.1:8787/demo-x9k2vp4z/candidates` + `.../inject`
- Demo candidates count at deploy: 10 real NFI blacklist additions (CES, PHB, MLN, FARM, ATA, SKYAI, PSAI, BLUM, BSY, IZI)
- GitHub cache: `agent/agent/data/github_cache.json` (ETag + per-SHA symbol cache)
- Candidates cache: `agent/agent/data/demo_candidates.json`
- CORS origin: set `CORS_ORIGIN` env var to frontend URL before deploy (defaults to `*` for dev)

### Notes (filled when complete)
- `demo_loader.py` fetches last 20 commits that touched `NFI_BLACKLIST_PATH`, diffs consecutive snapshots to find new symbols, maps to `symbol_map.json`. Results cached in `demo_candidates.json`.
- ETag caching: commits list uses HTTP ETag (304 short-circuit). Per-SHA content cached forever in `github_cache.json` under `_symbol_cache` key (SHA-addressed URLs are immutable).
- On 304, `commits_order` from cache is used so candidates can be recomputed if `symbol_map.json` changes without a new GitHub fetch.
- Added 18 new BSC/Ethereum tokens to `symbol_map.json` matching recent NFI blacklist additions (IZI, PHB, MLN, UXLINK, SKYAI, CES, PSAI, YZY, RAIN, CORN, DAM, IAG, FARM, ATA, MONPRO, BSY, WAT + existing BLUM). Some placeholder addresses for newer tokens — price fetch falls back to $1 USD gracefully.
- Rate limit uses `cachetools.TTLCache(ttl=3600)` per IP; sliding window (resets on last write). Acceptable for demo use.
- `make_router(bus)` must be called from `main.py` after `bus` is created. Router is included once on startup.

---

# Module 4 — `web/` — Next.js frontend

**Status:** `complete` · **Depends on:** Module 1 (and Module 2 for live data)

**Purpose.** Where users see markets, place bets, view reasoning. The traction surface.

**Stack.** Next.js 14 App Router, TypeScript, Tailwind, **viem** (not ethers), Circle Modular Wallets SDK, Circle Paymaster.

### Pages

#### `/` — Live feed
Scrollable list, sorted by activity. Each card: token symbol + chain badge, AI confidence, time since opened, YES/NO odds, USDC pool, "Why?" link, "Bet" button. Real-time via WSS subscription to `MarketCreated` and per-market `Bet` events.

#### `/m/[address]` — Market detail
Full reasoning trace (fetched from IPFS via TraceRegistry hash), bet history, pools, Bet YES/NO buttons, expandable "Verify on-chain" panel showing hash + signature verification.

#### `/agent` — Agent profile
ERC-8004 link to Arc explorer, lifetime stats, methodology explainer, source code link.

#### `/history` — Resolved markets
Past markets with outcomes and a PnL leaderboard for top bettors (gamifies without needing a token).

#### `/demo` — Demo trigger page (Module 5)
*See Module 5.*

### Components

- `MarketCard` — feed and history
- `BetSheet` — bet modal, handles approve + bet + Paymaster
- `TraceViewer` — renders reasoning JSON nicely; this is the hero UI element, spend extra polish time here
- `WalletConnect` — Circle Modular Wallets primary, MetaMask fallback behind "advanced"
- `OddsDisplay` — pool ratio → implied probability

### Lib
- `arc.ts` — viem client, chain config (hardcode chain ID 5042002)
- `contracts.ts` — ABIs + addresses (from env)
- `wallets.ts` — Circle Modular Wallets init
- `paymaster.ts` — Paymaster client
- `ipfs.ts` — fetch trace JSON from gateway
- `markets.ts` — event indexer

### Files
```
web/
├── package.json
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── .env.local.example
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── m/[address]/page.tsx
│   │   ├── agent/page.tsx
│   │   ├── history/page.tsx
│   │   └── demo/page.tsx
│   ├── components/
│   │   ├── MarketCard.tsx
│   │   ├── BetSheet.tsx
│   │   ├── TraceViewer.tsx
│   │   ├── WalletConnect.tsx
│   │   ├── OddsDisplay.tsx
│   │   └── DemoCandidateButton.tsx
│   └── lib/
│       ├── arc.ts
│       ├── contracts.ts
│       ├── wallets.ts
│       ├── paymaster.ts
│       ├── ipfs.ts
│       ├── markets.ts
│       └── abis/
└── README.md
```

### Acceptance criteria
- `/` shows live markets pulled from Arc events
- Wallet connect works (Modular Wallets primary, MetaMask fallback)
- Bet completes end-to-end with sponsored gas
- `/m/[address]` shows trace with hash + signature verifying

### Cross-cutting checklist
- [x] Event log pagination implemented (1000-block chunks via `getLogs` + cached in sessionStorage)
- [x] Live `watchEvent` subscription wrapped in reconnect-with-backoff
- [x] Optimistic UI on `BetSheet` — pending position appears immediately, flips on confirm
- [x] React error boundaries around `MarketCard`, `TraceViewer`, `BetSheet`
- [x] All pages responsive on mobile (test in DevTools 375px width)
- [x] System status footer polling agent `/health` endpoint every 30s
- [x] viem `publicClient` wrapped with retry helper for transient RPC failures
- [x] ABIs read from `web/src/lib/abis/` populated by `make abis` (no hand-editing)

### Handoff (filled when complete)
- Deployed URL (Vercel): (pending deployment)
- All env vars documented in `web/.env.local.example`
- Circle Modular Wallets SDK: `@circle-fin/modular-wallets-core` (install separately from w3s-pw-web-sdk)
- `NEXT_PUBLIC_CIRCLE_CLIENT_KEY` + `NEXT_PUBLIC_CIRCLE_CLIENT_URL` needed for wallet connect to work

### Notes (filled when complete)
- shadcn/ui uses `@base-ui/react` not radix — `TooltipTrigger` does NOT support `asChild`. Remove `asChild` from all tooltip triggers.
- `P256Credential` type is from `viem/account-abstraction`, NOT from `@circle-fin/modular-wallets-core`.
- tsconfig `target` must be `ES2020` (not ES2017) for BigInt literal syntax.
- Dark mode forced via `className="dark"` on `<html>`. No light mode for v1.
- Design: Instrument Sans headings + Geist Sans body + Geist Mono numbers. Amber primary (#primary = oklch(0.78 0.16 65)). Red for YES (rug), green for NO (safe).
- Demo page (`/demo`) is complete and covers Module 5 scope with ThinkingPanel choreography.
- `use-modular-wallets` reference code uses `viem/chains.arcTestnet` — in viem v2 you need `defineChain` since `arcTestnet` may not be in the built-in chains list.
- All 6 build routes verified clean: `/`, `/_not-found`, `/agent`, `/demo`, `/history`, `/m/[address]`.

---

# Module 5 — `web/demo` — demo trigger UI

**Status:** `not_started` · **Depends on:** Module 3, Module 4

**Purpose.** The demo button page. One-click triggers a real-feeling market mint from a real NFI blacklist addition, for the demo video and live demos to investors/judges.

### Behavior

`/demo` page:

1. On load, calls `GET /demo/candidates` on the agent's HTTP server (the agent's URL is set via env var `NEXT_PUBLIC_AGENT_DEMO_URL`; defaults to `http://localhost:8787` for local dev, set to the deployed agent's URL in production)
2. Renders each candidate as a card with: token symbol, chain badge, the commit summary, link to the GitHub commit, and a big **"Trigger market mint"** button
3. Click → `POST /demo/inject` with the candidate id → show a loading state ("Agent is reasoning..." with a fake-progress indicator that takes ~8s, matching the real agent latency) → on success, redirect to `/m/[new_market_address]`
4. The page polls for the agent's response — when the agent emits a `MarketCreated` event after injection, the frontend picks it up via the same event watcher used by `/`

### UI polish

This is the page the demo video opens on. Make it look intentional:

- Header: "RugOracle Demo Console — pick a real rug iterativv flagged, watch the agent mint a market live"
- Candidate cards in a tidy grid (3-4 across on desktop, 1 across on mobile)
- Each card has: symbol + chain in a chip, the commit date, a one-line summary, the commit short hash with link icon, and the trigger button
- After clicking, show a streaming "agent thinking" panel that fakes the reasoning trace generation step-by-step (the real trace is what gets recorded; the UI is just choreography so the 8-second wait doesn't feel dead)

### Honesty

Add a small footer note on the page: *"Demo mode: signals are pulled from real NFI blacklist commits; the agent reasons about and mints them on demand. In production, the agent processes commits autonomously as they happen."*

This pre-empts any "is this fake?" criticism — judges and viewers see it's real data, just manually triggered.

### Files
```
web/src/app/demo/
├── page.tsx
└── components/
    ├── CandidateCard.tsx
    └── ThinkingPanel.tsx
```

### Acceptance criteria
- `/demo` lists ≥5 real candidates fetched from the agent
- Clicking trigger results in a market deployed on Arc within ~15s
- Redirect to the new market detail page works
- Honesty footer is present and clear

### Cross-cutting checklist
- [ ] Page is mobile-responsive (this URL gets shared on phones)
- [ ] Uses `NEXT_PUBLIC_DEMO_API_SECRET` for the obscured demo endpoint path
- [ ] Error boundary around the candidate grid (one broken candidate doesn't kill the page)
- [ ] Loading and error states for the candidates fetch
- [ ] `ThinkingPanel` choreography is at least 6 seconds (real reasoning takes 5-8s; matches reality)

### Handoff (filled when complete)
- Demo page URL:

### Notes (filled when complete)
*To be filled by Claude when module marked complete.*

---

# Module 6 — `bot/` — Twitter/Telegram poster

**Status:** `not_started` · **Depends on:** Module 1

**Purpose.** Auto-post every new market. Traction engine that runs 24/7 after launch.

### Behavior

WSS subscription to `MarketRegistry.MarketCreated` events. On each event, draft a post and publish.

Template:
```
🚨 New rug market live

$[SYMBOL] on [CHAIN]
Confidence: [SCORE]/1.0
Signals: [3-word summary]

Bet on it before [TIME]:
[deep link]

[explorer link to trace]
```

### Channels

**Primary: Telegram.** Free, 30-second bot setup via @BotFather. Post to a public channel.

**Secondary: Twitter (if budget allows).** Twitter API basic write tier is paid (~$100/mo). If skipping, document as roadmap.

### Files
```
bot/
├── pyproject.toml
├── .env.example
├── bot/
│   ├── main.py
│   ├── telegram.py
│   ├── twitter.py        # only if enabled
│   └── templates.py
└── README.md
```

### Acceptance criteria
- Bot connects to Arc WSS, logs every `MarketCreated`, posts within 30s
- Handles reconnects with exponential backoff
- Demo-injected markets get a tag in the post (e.g. "🧪 demo mint") for honesty

### Cross-cutting checklist
- [ ] WSS reconnect-with-backoff (start 1s, cap at 60s, jitter)
- [ ] Last-seen block persisted to disk so a restart doesn't replay or miss events
- [ ] `GET /health` endpoint live
- [ ] Structured JSON logging matching agent's format
- [ ] Idempotent: posting twice for the same `MarketCreated` event is detected and skipped (track posted market addresses in a small SQLite or even a flat file)

### Handoff (filled when complete)
- Telegram channel link:
- Bot deployment host:

### Notes (filled when complete)
*To be filled by Claude when module marked complete.*

---

# Module 7 — `infra/` — deploy + run scripts

**Status:** `not_started` · **Depends on:** all

**Purpose.** One-shot deploy and run for the demo.

### Make targets

```makefile
deploy-contracts:   # forge script + write addresses to deployed.json
abis:               # export ABIs from contracts/out/ to agent/ and web/ paths
build-agent:        # uv install + ruff check
run-agent:          # spawn agent process (local or via Fly/Render)
run-bot:            # spawn bot process
dev-web:            # next dev
build-web:          # next build
deploy-web:         # vercel deploy
seed-demo:          # populate 3-5 demo markets so the feed isn't empty
refresh-candidates: # re-fetch NFI blacklist additions for demo
status:             # curl every /health endpoint, print red/yellow/green per service
db-reset:           # wipe agent SQLite state (for clean local restarts)
```

### Files
```
infra/
├── Makefile
├── deploy/
│   ├── deploy_contracts.sh
│   ├── export_abis.sh           # contracts/out/ → agent + web abi dirs
│   └── export_addresses.py      # writes addresses to .env files
├── seed/
│   └── inject_demo_signals.py
├── status/
│   └── check_all.sh             # backs the `make status` target
├── deployed.json
└── README.md
```

### Acceptance criteria
- Clean machine + checkout → `make` chain produces a running app
- Addresses propagate from contracts deploy into agent and web env files
- `make abis` after every contract change updates both ABI directories
- `make status` clearly reports each service's health

### Notes (filled when complete)
*To be filled by Claude when module marked complete.*

---

# Module 8 — `submission`

**Status:** `not_started` · **Depends on:** all

**Purpose.** Ship.

### Deliverables

1. **Public GitHub repo.** Clean root README with: pitch, architecture diagram, contract addresses + explorer links, video link, live URL, "how to run locally".

2. **2.5-minute Loom video.** Script:
   - 0:00–0:15 — Open on `/demo` page. "This is RugOracle. We built an AI agent on Arc that watches rugpull signals and autonomously mints prediction markets."
   - 0:15–0:45 — "Here are real recent blacklist additions from iterativv, the maintainer of NostalgiaForInfinity. Watch what happens when I trigger one." Click BLUM (or whichever). Show the thinking panel. Cut to market detail page.
   - 0:45–1:30 — "The agent reasoned through three signals, decided to mint, and the trace is hashed on-chain right here." Expand TraceViewer. Click "Verify on-chain", show signature verifying. Click explorer link, show the on-chain trace record.
   - 1:30–2:00 — "Anyone can bet, gaslessly, in seconds." Wallet connect (embedded). Bet $1 YES. Confirm. Show transaction.
   - 2:00–2:20 — Cut to Telegram channel showing the auto-posted market. Cut to `/agent` page showing ERC-8004 identity link.
   - 2:20–2:30 — "Built on Arc with Circle's stack: USDC, Modular Wallets, Paymaster, Smart Contracts. The first prediction market vertical where the oracle is a real rugpull expert. RugOracle dot xyz."

3. **Submission form.** Repo link, video link, live URL, traction writeup. Honest numbers (testnet only).

4. **Post-submission distribution.** See bottom of doc.

### Acceptance criteria
- Form submitted with all required fields
- Repo is public and links work
- Video renders and is under 3 minutes
- Live URL is reachable

### Notes (filled when complete)
*To be filled by Claude when module marked complete.*

---

## Hour-by-hour schedule (reference)

Built with Claude assistance. ~24 working hours over 2 days. Modules in order; each can complete faster than budgeted, in which case start the next.

### Day 1

- **H 0–1** — Setup: Circle skills + Arc MCP confirmed, faucet, repo init
- **H 1–4** — Module 1 (contracts) build + deploy
- **H 4–8** — Module 2 (agent core + NFI collector + first end-to-end mint)
- **H 8–9** — Module 3 (demo injection) — small module, slot in here
- **H 9–12** — Module 4 start (frontend skeleton, feed, MarketCard, basic wallet)

### Day 2

- **H 12–14** — Module 4 finish (BetSheet, TraceViewer, market detail page)
- **H 14–16** — Module 5 (demo page UI)
- **H 16–18** — Module 2 finish (price_anomaly collector + resolver), Paymaster integration
- **H 18–20** — Module 6 (bot, Telegram first)
- **H 20–22** — Module 7 (deploy, seed, end-to-end verify)
- **H 22–24** — Module 8 (record video, polish README, submit)

### Pivot rules

- H6, no contract deployed → drop `TraceRegistry`, inline trace hash in `MarketRegistry.createMarket`, no IPFS. Recovers 2h.
- H14, only NFI collector working → ship NFI-only, reframe as "human-maintainer-as-oracle". Still novel.
- H18, Paymaster broken → drop it. USDC-as-gas is already OK UX.
- H20, Twitter painful → Telegram only. (Plan already prioritizes Telegram.)

All pivots logged in **Pivot Log** below.

---

## Known limitations (disclose in submission)

1. Resolver centralization. v1 uses backend resolver; future is Chainlink/Pyth + permissionless challenge.
2. Token-to-address mapping is a hardcoded JSON; future is on-chain registry with submissions.
3. Sandwich risk near resolution mitigated by 1h pre-close, not eliminated.
4. Signal scope: v1 ships NFI + price anomaly. Solana LP and social velocity are roadmap.
5. Testnet only. Arc mainnet is summer 2026. All volume reported is testnet USDC.

---

## Post-submission traction plan

Traction extends past the deadline.

- Soft launch in a memecoin-watcher Telegram or Discord, framed as "auto-bets on rug detection"
- Pitch `@iterativv` directly with attribution and link
- Cross-post r/CryptoCurrency, r/algotrading
- Reach out to rug-detector Twitter accounts (10k+ follower range)
- Submit to Circle/Arc community "what people built" channels

The Telegram bot tweeting every new market is the main flywheel.

---

## Pivot Log

*Append entries here as pivots happen.*

Format:
```
### YYYY-MM-DD HH:MM — <module> — <one-line summary>
**Trigger:** what forced the pivot
**Change:** what changed in scope or approach
**Impact:** what's now different downstream
```

*(empty)*