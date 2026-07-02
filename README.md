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
- **Accounts & cross-device sync** — connect a wallet and optionally **Sign in
  to sync** (Sign-In With Ethereum). Signed in, your net-worth history and
  tracked positions are saved server-side and follow you across devices,
  surviving a browser-cache clear. Not signed in, everything still works in
  guest mode against `localStorage` — no account required.

## Accounts, sync, and the server store

Sign-in uses [SIWE](https://eips.ethereum.org/EIPS/eip-4361); the server
verifies the signature in a smart-wallet-aware way (ERC-1271/6492, so the
Coinbase Smart Wallet works) and issues a stateless, HMAC-signed session
cookie (`SESSION_SECRET`). Per-account data is read/written through a small
`UserDataStore` seam (`src/lib/server/store.ts`) with two backends:

- **File store** (default) — JSON at `./.data` (override with `DATA_DIR`),
  fine for a single server / development.
- **Postgres** — used automatically when `DATABASE_URL` is set
  (`src/lib/server/postgresStore.ts`). Apply `migrations/001_init.sql` first.
  Production-grade and safe across serverless / multiple instances.

A scheduled job (`/api/cron/snapshot`, wired via `vercel.json` and protected by
`CRON_SECRET`) recomputes each tracked wallet's net worth server-side once a
day, so history keeps accruing even when a user isn't visiting.

A `/pricing` page with a waitlist (`/api/waitlist`) is included as a Phase 0
demand test for the planned paid "Pro" tier. See `docs/MARKET-FIT-ROADMAP.md`
for the phased plan.

## Automatic portfolio detection (Pro)

Detecting which tokens and LP/vault positions a wallet holds across every
protocol and chain requires a paid indexer. That's wired as an optional **Pro**
tier: set `ZERION_API_KEY` and a signed-in, entitled user's dashboard switches
from the curated Base flow to automatic, complete, **multi-chain** detection
via `/api/portfolio` — all tokens plus DeFi positions (deposits, staked,
rewards, loans), each already priced.

The indexer sits behind a provider seam (`src/lib/server/portfolio/`), so
swapping or adding providers (DeBank, Zapper, Covalent, Alchemy) doesn't touch
the route or the client.

## Billing (Pro subscriptions)

Pro is sold via Stripe when configured (`STRIPE_SECRET_KEY`,
`STRIPE_PRO_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`; apply
`migrations/002_subscriptions.sql`). The `/pricing` page's Pro CTA adapts to
state — **Upgrade** (Stripe Checkout) → **Manage** (Stripe Billing Portal) —
and falls back to the waitlist when billing isn't live. Subscription lifecycle
events arrive at `/api/billing/webhook` (signature-verified) and are mirrored
into the store.

Entitlement is enforced **server-side** from that subscription state
(`isEntitledPro`): `PRO_ADDRESSES` grants comps regardless of billing; with
billing on, access requires a live (active/trialing) subscription; with billing
off, dev falls back to treating signed-in users as Pro. The auto-detection
route and every paid surface read this one check.

**Without an indexer key the app is unchanged** — free, Base-only, on public
data, with DeFi positions tracked manually: browse the live pool leaderboard,
hit **Track**, enter what you put in, and it's folded into your totals and
charts from then on.

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
