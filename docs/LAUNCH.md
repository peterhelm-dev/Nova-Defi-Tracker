# Launch Novafolio on Vercel Hobby

Production URL: **https://www.novafolio.app**

`https://novafolio.app` redirects to www. Canonical links, the sitemap, and
`robots.txt` follow www unless you set another origin. To make the apex the
primary host instead, change that redirect in Vercel and set
`NEXT_PUBLIC_SITE_URL` to the apex.

Set this on the Vercel project:

```bash
NEXT_PUBLIC_SITE_URL=https://www.novafolio.app
```

That value is the canonical URL in page metadata. If it is missing, production
still falls back to `https://www.novafolio.app`, and a Vercel preview uses its own
host only for image URLs.

## What ships on the free tier

- Connect Coinbase (including the Smart Wallet), MetaMask, or Rabby. WalletConnect
  appears only after the optional project id below is set.
- Watch extra wallets by pasting a `0x` address or an ENS name. Up to 8 saved
  wallets, stored in the browser.
- Token balances on Ethereum, Base, Arbitrum, Optimism, Polygon, BNB Chain, and
  Avalanche.
- Aave v3 supply and borrow, Compound v3, and common liquid staking tokens,
  read onchain. Receipt tokens are not also counted as cash. Anything else
  stays on manual “Track”.
- Research: token and pool pages, a true-yield estimate, and a before-you-deposit
  checklist. Compare and saved items stay in the browser.
- Open ERC-20 approvals (with revoke.cash links), dust versus gas, and a short
  gas and transfer history. Those three need the Alchemy key. Profit and loss
  is not estimated.
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

The same Alchemy key prices the curated token list (`/api/prices`) and fills
in a chart when CoinGecko is rate-limited. You do not need a separate price
key. Leave the Alchemy app’s Security tab fully open, which is the right
setup for server calls from Vercel. CoinGecko’s free token endpoint allows
only one contract address per call, so the fallback asks for one token at a
time and keeps whatever comes back. A batch of the whole list, or a 429 from
Vercel’s shared IPs, used to wipe every quote and return 502.

### Rough Alchemy use on the free plan

30 million compute units per month. A cold look at one wallet is on the order of:

| Read | Cache | About |
| --- | --- | --- |
| Token balances | 5 minutes | 2 portfolio calls, 720 CU |
| Aave, Compound, staking | 5 minutes | a few multicalls per chain, a few hundred CU |
| Prices and gas prices | 5–10 minutes, shared by everyone | not per wallet |
| Approvals | 30 minutes | one log query per chain |
| Gas and recent transfers | 10 minutes | a handful of transfer calls, then at most 6 receipts per chain |

The browser asks again every 5 minutes while a dashboard tab is open, and the
server cache absorbs that. A few dozen people checking a wallet a couple of
times a day stays far under 30M. A bot refreshing unique addresses all day
would not. Profit and loss is not requested, because Novafolio does not invent
a cost basis.

### Per-IP limits on Alchemy routes

`/api/portfolio`, `/api/activity`, `/api/gas`, `/api/approvals`, `/api/prices`,
`/api/token-chart`, and `/api/network-costs` are limited per IP. No new
variable is required. On Vercel Hobby the window is in memory on whichever
function instance handled the request, so a burst can still be split across
instances.

To share one counter, set both of these from the Upstash free tier (leave both
unset otherwise):

```bash
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

A visitor who crosses the window gets HTTP 429 and a `Retry-After` header.
The wallet address is not part of the counter.

## Optional keys

| Variable | Where | Why |
| --- | --- | --- |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | [cloud.reown.com](https://cloud.reown.com) (free) | QR / mobile wallets. Omit it and the button stays hidden. |
| `NEXT_PUBLIC_ONCHAINKIT_API_KEY` | [portal.cdp.coinbase.com](https://portal.cdp.coinbase.com) (free) | Coinbase’s Base RPC. Public RPCs are used otherwise. |
| `COINGECKO_API_KEY` | CoinGecko demo dashboard | Optional fallback. Leave unset while `ALCHEMY_API_KEY` is set. If you add a Demo key, leave `COINGECKO_PLAN` empty. Set `COINGECKO_PLAN=pro` only for a paid Pro key. |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | A mailbox you read | Shown on `/support`. If unset, the page does not invent an address. |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | Plausible | Optional second counter. Unset = Plausible stays off. Vercel Web Analytics is separate and cookieless. |
| `DATABASE_URL` | Neon or Supabase free Postgres | Turns on sign-in sync, the waitlist, and daily snapshots. |
| `SESSION_SECRET` | `openssl rand -base64 32` | Required before anyone can sign in. |
| `CRON_SECRET` | `openssl rand -base64 32` | Vercel Cron sends this as `Authorization: Bearer`. A `?secret=` query param is rejected. |

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
   - `NEXT_PUBLIC_SITE_URL` = `https://www.novafolio.app`
   - `ALCHEMY_API_KEY` = the free key
   - `CRON_SECRET` = a random string (Vercel sends it as a Bearer token; do not put it in the cron URL)
4. Deploy.
5. Project → Settings → Domains → add `www.novafolio.app` as the primary host
   and `novafolio.app` as a redirect to www. Follow the DNS records Vercel shows.
6. Project → Analytics → enable Web Analytics. The app already includes the
   cookieless `@vercel/analytics` component. It does not set a cookie.
7. Open `https://www.novafolio.app`. You should see the empty state, the wallet
   box, and the pool table. Paste your own address and confirm the tokens you
   expect. The banner should **not** say “major tokens only” once the Alchemy
   key is set.
8. Open `/pricing`. It must say Pro is coming soon and must not show a card form.

Add `DATABASE_URL` and `SESSION_SECRET` later if you want sign-in. Apply
`migrations/001_init.sql` (and `002_subscriptions.sql` before any future
billing) to that database first.

## Pre-launch checklist

- [ ] `https://www.novafolio.app` loads, the apex redirects there, and the padlock is valid
- [ ] `NEXT_PUBLIC_SITE_URL=https://www.novafolio.app` is set in Production
- [ ] Web Analytics is enabled for the project
- [ ] `ALCHEMY_API_KEY` is set, and a wallet you control shows more than just ETH/USDC
- [ ] Pasting an ENS name resolves, and pasting a second address adds it
- [ ] Coinbase, MetaMask, and Rabby appear in the connect dialog
- [ ] `/pricing` says coming soon and does not start a payment
- [ ] `/terms`, `/privacy`, and `/support` open, and the footer says this is not financial advice
- [ ] No `STRIPE_*` variables are set
- [ ] Support email is either a real mailbox or left unset
- [ ] A lawyer has seen the terms and privacy pages before you take anyone’s money later
