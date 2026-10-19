# Novafolio

A read-only tracker for the crypto wallets you connect or watch. Paste an
address or ENS name, or connect Coinbase, MetaMask, or Rabby, and see token
balances across Ethereum, Base, Arbitrum, Optimism, Polygon, BNB Chain, and
Avalanche.

Production site: [https://novafolio.app](https://novafolio.app).

Deploy steps, which free API keys to create, and the Vercel Hobby limits are
in [docs/LAUNCH.md](docs/LAUNCH.md).

## What it does

- **Several wallets** — the connected wallet, plus watch-only addresses saved
  in this browser (up to 8).
- **Token balances** — Alchemy's free portfolio API when `ALCHEMY_API_KEY` is
  set. Without that key, Novafolio reads native coins and a short list of
  major tokens from public RPCs and prices them with CoinGecko.
- **DeFi pools** — live TVL and APY on the major chains from DeFiLlama.
  Tracking a position is manual: Novafolio never moves funds.
- **Guest mode** — no account required. Net-worth history and tracked
  positions stay in this browser.
- **Optional sync** — Sign-In With Ethereum, only when `DATABASE_URL` and
  `SESSION_SECRET` are set. On Vercel the file store is refused so data is
  not silently lost.
- **Pro** — not for sale. The pricing page says coming soon and only collects
  waitlist emails when a database is configured.

Nothing in the product is financial advice.

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). No API key is required
for the major-token fallback. For full automatic token detection, copy
`.env.local.example` to `.env.local` and set `ALCHEMY_API_KEY` (free).

## Testing

```bash
npm run test:unit   # Vitest
npm run test:e2e    # Playwright
```

E2E tests mock `/api/prices` and `/api/defi-pools`. `npm run test:e2e` starts
its own dev server.
