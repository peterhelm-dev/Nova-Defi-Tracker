# Launch Novafolio on Vercel Hobby

Production URL: **https://novafolio.app**

Set this on the Vercel project:

```bash
NEXT_PUBLIC_SITE_URL=https://novafolio.app
```

That value is the canonical URL in page metadata. If it is missing, production
still falls back to `https://novafolio.app`, and a Vercel preview uses its own
host only for image URLs.

## What ships on the free tier

- Connect Coinbase (including the Smart Wallet), MetaMask, or Rabby. WalletConnect
  appears only after the optional project id below is set.
- Watch extra wallets by pasting a `0x` address or an ENS name. Up to 8 saved
  wallets, stored in the browser.
- Token balances on Ethereum, Base, Arbitrum, Optimism, Polygon, BNB Chain, and
  Avalanche.
- DeFi pool list for those chains, with manual “Track” and CSV export.
- Pro is labeled **coming soon**. There is no checkout unless Stripe and a
  database are both configured later.

Solana is not included. A Solana account is not a `0x` address, so it would be
a second product, not a free extra on the same call.

## Which free key to create

**Create this one. It is the difference between “every token” and “major tokens only”.**

| Variable | Where to sign up | Cost | Required? |
| --- | --- | --- | --- |
| `ALCHEMY_API_KEY` | [dashboard.alchemy.com](https://dashboard.alchemy.com) → sign up → Create app → copy the API key | $0. Free plan includes 30 million compute units per month. | Yes, for automatic detection |

Why Alchemy, and not the other free tiers:

- **Alchemy Portfolio API** (`assets/tokens/by-address`) returns native and ERC-20
  balances, names, logos, and USD prices for many chains. One request is 360
  compute units and accepts at most 5 networks, so Novafolio makes two cached
  calls (the five main chains, then BNB + Avalanche). 30M units is on the order
  of tens of thousands of uncached wallet loads a month. Responses are cached
  for 5 minutes.
- **Zerion Developer** is $0 but only 2,000 requests/day, and it is described as
  a prototype tier. DeFi-position calls count against a smaller sub-limit. Leave
  `ZERION_API_KEY` unset at launch.
- **GoldRush (Covalent)** free access is a 14-day trial, not a plan you can
  launch on.
- **Moralis** wallet endpoints are on paid plans (or a very small free daily
  cap that is easy to exhaust once per chain).

If `ALCHEMY_API_KEY` is missing or Alchemy errors, Novafolio falls back to
public RPCs plus CoinGecko and shows native coins and a short major-token list.
The dashboard says so. Nothing crashes.

## Optional keys

| Variable | Where | Why |
| --- | --- | --- |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | [cloud.reown.com](https://cloud.reown.com) (free) | QR / mobile wallets. Omit it and the button stays hidden. |
| `NEXT_PUBLIC_ONCHAINKIT_API_KEY` | [portal.cdp.coinbase.com](https://portal.cdp.coinbase.com) (free) | Coinbase’s Base RPC. Public RPCs are used otherwise. |
| `COINGECKO_API_KEY` | CoinGecko demo dashboard | Only if public price calls start failing. |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | A mailbox you read | Shown on `/support`. If unset, the page does not invent an address. |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | Plausible | Set to `novafolio.app` if you want cookie-less analytics. Unset = none. |
| `DATABASE_URL` | Neon or Supabase free Postgres | Turns on sign-in sync, the waitlist, and daily snapshots. |
| `SESSION_SECRET` | `openssl rand -base64 32` | Required before anyone can sign in. |
| `CRON_SECRET` | `openssl rand -base64 32` | Vercel sends this to the daily jobs. |

Do **not** set `STRIPE_SECRET_KEY`, `STRIPE_PRO_PRICE_ID`, or
`STRIPE_WEBHOOK_SECRET` until you intend to charge. Pro stays “coming soon”.

## What does not persist on Hobby without a database

Vercel functions do not share a disk. Writing `./.data/store.json` would accept
a waitlist email or a synced portfolio and then lose it. Novafolio refuses
those writes unless `DATABASE_URL` is set:

- Sign-in returns a clear error instead of issuing a session.
- Waitlist returns “not saved” and the pricing page does not show the form.
- Positions, snapshots, and alerts APIs return 503.
- The header says the portfolio stays in this browser.
- Both cron jobs return immediately and do nothing.

Local `npm run dev` still uses the file store, which is fine on one machine.

## Crons on the Hobby plan

Hobby cron jobs may run **once per day**. An hourly schedule fails the deploy.
`vercel.json` schedules:

- net-worth snapshot at 06:00 UTC
- price alerts at 07:00 UTC

Hobby may run each job any time during that hour. Alerts are therefore daily,
not instant. Both jobs no-op without `DATABASE_URL`.

## Deploy

1. Push this repo to GitHub.
2. In Vercel, **Add New → Project**, import the repo, framework Next.js.
3. Environment variables for Production:
   - `NEXT_PUBLIC_SITE_URL` = `https://novafolio.app`
   - `ALCHEMY_API_KEY` = the free key
   - `CRON_SECRET` = a random string (so the cron URLs are not public)
4. Deploy.
5. Project → Settings → Domains → add `novafolio.app` and follow the DNS
   records Vercel shows (usually an A record or CNAME at the registrar).
6. Open `https://novafolio.app`. You should see the empty state, the wallet
   box, and the pool table. Paste your own address and confirm the tokens you
   expect. The banner should **not** say “major tokens only” once the Alchemy
   key is set.
7. Open `/pricing`. It must say Pro is coming soon and must not show a card form.

Add `DATABASE_URL` and `SESSION_SECRET` later if you want sign-in. Apply
`migrations/001_init.sql` (and `002_subscriptions.sql` before any future
billing) to that database first.

## Pre-launch checklist

- [ ] `https://novafolio.app` loads and the padlock is valid
- [ ] `NEXT_PUBLIC_SITE_URL=https://novafolio.app` is set in Production
- [ ] `ALCHEMY_API_KEY` is set, and a wallet you control shows more than just ETH/USDC
- [ ] Pasting an ENS name resolves, and pasting a second address adds it
- [ ] Coinbase, MetaMask, and Rabby appear in the connect dialog
- [ ] `/pricing` says coming soon and does not start a payment
- [ ] `/terms`, `/privacy`, and `/support` open, and the footer says this is not financial advice
- [ ] No `STRIPE_*` variables are set
- [ ] Support email is either a real mailbox or left unset
- [ ] A lawyer has seen the terms and privacy pages before you take anyone’s money later
