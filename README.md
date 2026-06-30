# Base Wealth Tracker

A Coinbase-style onchain wealth tracker for [Base](https://base.org). Connect
a wallet, see your net worth update live with graphs and an allocation
breakdown, and track DeFi pool positions alongside your token holdings —
all from free public data sources, no signup required.

## What it does

- **Connect Wallet** — powered by [OnchainKit](https://onchainkit.xyz), Coinbase's own
  SDK for Base. Connects via Coinbase Smart Wallet or the Coinbase Wallet
  extension/app.
- **Net worth dashboard** — live ETH + ERC-20 balances on Base, read directly
  from the chain via `wagmi`/`viem` multicall, priced with CoinGecko.
- **Net worth history** — a daily snapshot is saved to `localStorage` so the
  area chart builds up real history the longer you use the app (there's no
  backend, so there's no history before the day you first open it).
- **Asset allocation** — a pie chart of holdings by token, including your
  tracked DeFi positions as a slice.
- **DeFi pool explorer** — live TVL/APY for Base pools from
  [DeFiLlama](https://defillama.com/), searchable and sortable. "Track" any
  pool with a USD amount to fold it into your net worth and allocation chart.

## Why no DeFi position auto-detection?

Automatically detecting which LP/vault tokens a wallet holds across every
Base protocol requires a paid indexer (Zapper, DeBank, Zerion, etc.). To keep
this app running on free public APIs only, DeFi positions are tracked
manually: browse the live pool leaderboard, hit **Track**, enter what you put
in, and it's included in your totals and charts from then on.

## Tech stack

- **Next.js 16** (App Router, TypeScript)
- **OnchainKit + wagmi + viem** — wallet connection and onchain reads on Base
- **TanStack Query** — data fetching/caching for prices and pool data
- **Recharts** — net worth history and allocation charts
- **CoinGecko public API** — token prices (`/simple/token_price/base`)
- **DeFiLlama public API** — Base pool TVL/APY (`yields.llama.fi/pools`)

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and connect a wallet —
that's it, no API keys required.

### Optional: Coinbase Developer Platform API key

Copy `.env.local.example` to `.env.local` and set
`NEXT_PUBLIC_ONCHAINKIT_API_KEY` with a free key from
[portal.cdp.coinbase.com](https://portal.cdp.coinbase.com) to route Base RPC
calls through Coinbase's own node instead of the public endpoint, and to
unlock OnchainKit paymaster features. Everything works without it.

## Testing

```bash
npm run test:unit   # Vitest — pure logic in src/lib and hooks
npm run test:e2e    # Playwright — empty wallet state + DeFi pools UI flows
```

E2E tests mock `/api/prices` and `/api/defi-pools` via Playwright route
interception, so they're deterministic and don't depend on CoinGecko/
DeFiLlama being reachable. `npm run test:e2e` starts its own dev server on
port 3100; no need to run `npm run dev` separately first.

CI (`.github/workflows/ci.yml`) runs lint, build, unit, and e2e tests on
every push/PR.

## Extending this

- **More tokens** — add entries to `src/lib/tokens.ts`. Verify any contract
  address against [basescan.org](https://basescan.org) before trusting it.
- **More chains** — the app is scoped to Base mainnet by design; adding a
  chain means updating `src/lib/wagmi.ts`, the token list, and the price/pool
  API routes.
- **Persisted history across devices** — swap `useNetWorthHistory`'s
  localStorage calls for a small backend/database if you want history that
  survives clearing browser storage or syncs across devices.
- **Automatic DeFi position detection** — plug a paid portfolio API (Zapper,
  DeBank, Covalent) into `useDefiPools`/`useTrackedPositions` to replace the
  manual "Track" flow.
