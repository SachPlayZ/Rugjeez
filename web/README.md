# RugOracle — Frontend

Next.js 14 App Router frontend for RugOracle, the autonomous AI prediction market agent on Arc Testnet.

## Stack

- **Next.js 14** App Router, TypeScript strict
- **Tailwind CSS v4** + **shadcn/ui** (base-ui components)
- **viem v2** — all on-chain reads (no ethers)
- **Circle Modular Wallets** — passkey smart accounts, gasless bets
- **Fonts**: Instrument Sans (headings) + Geist Sans (body) + Geist Mono (code)

## Pages

| Route | Description |
|-------|-------------|
| `/` | Live market feed — real-time via WSS |
| `/m/[address]` | Market detail, trace viewer, bet UI |
| `/agent` | Agent profile, signal sources, contracts |
| `/history` | Resolved markets |
| `/demo` | Manual signal injection console (Module 5) |

## Setup

```bash
cp .env.local.example .env.local
# fill in your values

npm install
npm run dev
```

## Environment Variables

See `.env.local.example` for all required vars. Key ones:

```
NEXT_PUBLIC_MARKET_REGISTRY_ADDRESS=0xa1Db4fBe80E7064E8bC70b6138a11572cFE1f79b
NEXT_PUBLIC_TRACE_REGISTRY_ADDRESS=0x614A1F64395FD1b925E347AC13812CC48b62f5B7
NEXT_PUBLIC_CIRCLE_CLIENT_KEY=          # from Circle Console
NEXT_PUBLIC_CIRCLE_CLIENT_URL=          # from Circle Console
NEXT_PUBLIC_AGENT_DEMO_URL=http://localhost:8787
```

## Architecture Notes

- All on-chain reads use `getLogs` in 1000-block chunks (historical) + `watchEvent` (live)
- Historical events cached in `sessionStorage` keyed by latest block number
- WSS subscription wrapped in reconnect loop with exponential backoff (1s → 60s)
- BetSheet uses optimistic UI: pending position shown immediately, flips on Arc confirmation (~1s)
- Circle Modular Wallets: passkey register/login → smart account → gasless `sendUserOperation`
- React error boundaries wrap `MarketCard`, `TraceViewer`, `BetSheet`
- Mobile-first responsive, tested at 375px

## Deploy

```bash
npm run build          # verify
vercel deploy          # deploy to Vercel
```

Set all `NEXT_PUBLIC_*` env vars in Vercel dashboard.
