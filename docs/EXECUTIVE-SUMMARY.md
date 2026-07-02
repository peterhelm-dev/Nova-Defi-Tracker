# Base Wealth Tracker — Executive Summary

_Last updated: 2026-07-02 · Companion to `docs/MARKET-FIT-ROADMAP.md`_

## The product in one paragraph

A non-custodial crypto portfolio tracker built on Base and Coinbase's own
wallet stack. Free tier: connect a wallet, see live net worth, history, and
allocation from public data — no signup. Paid tier (**Pro**): sign in with
your wallet and get automatic, complete, multi-chain detection of every token
and DeFi position, synced across devices, billed through Stripe. Target
customer hypothesis: DeFi-native power users, validated first via the built-in
waitlist.

## Where we are

**All engineering phases of the market-fit roadmap are code-complete and
merged to `main`** (PR #1). What remains before launch is operational —
accounts, keys, and third-party setup — not software development.

| Phase | Scope | Status |
|---|---|---|
| 0 — Demand test | Pricing page + Pro waitlist | ✅ Shipped |
| 1 — Backend & accounts | Sign-In With Ethereum, cross-device sync, Postgres adapter, daily snapshot cron | ✅ Shipped |
| 2 — Auto-detection | Indexer seam + Zerion adapter, multi-chain portfolio API | ✅ Shipped |
| 3 — Billing | Stripe checkout/portal/webhook, server-enforced entitlements | ✅ Shipped |
| 4 — Trust | Terms, privacy, support/FAQ, error boundaries, security headers | ✅ Shipped |
| 5 — Differentiation | PnL/cost basis, alerts, exports | Backlog — drive from waitlist/usage data |

Quality gates on `main`: TypeScript strict, ESLint clean, 51 unit tests,
6 end-to-end tests, CI on every push. Every paid integration degrades
gracefully: with no keys configured the app runs exactly as the original free
demo.

**Two integrations still need live-key validation** (impossible from the dev
sandbox): the Zerion response mapper and the Stripe webhook flow. Both were
built against documented APIs with fixture tests and isolated so validation is
a small, contained task once keys exist.

## Cost to operate (estimates — verify current vendor pricing)

### Monthly, at launch scale (≈0–200 users)

| Item | Vendor | Est. cost |
|---|---|---|
| Hosting (app + cron) | Vercel Pro (commercial use requires paid plan) | ~$20/mo |
| Postgres | Neon / Supabase (free tier → first paid tier) | $0–25/mo |
| Portfolio indexer (the Pro feature) | Zerion (or Covalent/Alchemy/DeBank) | $0–100/mo dev tier; **$100–500/mo as usage grows — the single biggest cost lever** |
| Token prices | CoinGecko (free tier; server caches 30s) | $0 → $129/mo only if rate limits bite |
| Pool data | DeFiLlama | Free |
| Base RPC | Coinbase CDP free tier / public RPC | $0 |
| Payments | Stripe | No fixed fee; ~2.9% + 30¢ per charge (+Billing %) |
| Error monitoring | Sentry (free tier → Team) | $0–26/mo |
| Analytics (Phase 0) | Plausible / PostHog | $0–9/mo |
| Support mailbox | Google Workspace or alias | $0–7/mo |

**Realistic launch burn: roughly $20–80/month** on free tiers, rising toward
**$150–700/month** as the indexer and database move to paid tiers with real
usage. Indexer pricing scales with requests — cache aggressively (already
built in) and negotiate once volume is known.

### One-time / annual

| Item | Est. cost |
|---|---|
| Domain | ~$15/yr |
| Legal review of Terms/Privacy (drafts are in the repo) | $500–2,500 one-time |
| Business entity (LLC recommended before taking money) | $50–800 formation + ~$100–300/yr agent/fees |

### Total cost to reach the marketplace

Engineering is done, so the path to a public, paying launch is approximately:

- **Cash:** ~$700–4,000 one-time (dominated by legal + entity) plus the first
  months of the ~$20–80/mo baseline.
- **Time:** ~3–6 weeks, gated by third-party lead times, not code — Stripe
  business verification (days), legal review (1–2 weeks), and a 2–4 week
  private beta with real wallets to validate Zerion data quality and the
  billing loop end-to-end.

Break-even math at $12/mo Pro: ~10–15 subscribers covers the launch-scale
baseline; ~60 covers a fully paid stack (~$700/mo).

## Your manual checklist (in order)

**A. Accounts & keys (≈1 day of signups)**
1. Register a domain; set `NEXT_PUBLIC_SITE_URL`.
2. Vercel account → import the GitHub repo (cron in `vercel.json` deploys automatically).
3. Postgres (Neon or Supabase) → run `migrations/001_init.sql` and `002_subscriptions.sql` → set `DATABASE_URL`.
4. Generate secrets: `openssl rand -base64 32` for `SESSION_SECRET` and again for `CRON_SECRET`.
5. Coinbase CDP key (free, portal.cdp.coinbase.com) → `NEXT_PUBLIC_ONCHAINKIT_API_KEY` (optional but recommended).
6. Zerion API key (developers.zerion.io) → `ZERION_API_KEY`. Compare a wallet you own against the dashboard to validate the mapper.
7. Stripe: create account → complete business verification → create "Pro" product + $12/mo recurring price → set `STRIPE_SECRET_KEY`, `STRIPE_PRO_PRICE_ID` → add webhook endpoint `https://<domain>/api/billing/webhook` (subscription + checkout events) → set `STRIPE_WEBHOOK_SECRET` → enable the customer Billing Portal. Test the full loop in test mode first.
8. Support mailbox you actually monitor → `NEXT_PUBLIC_SUPPORT_EMAIL`.

**B. Legitimacy (can run in parallel)**
9. Form an LLC (or equivalent) before charging real money.
10. Have a lawyer review `/terms` and `/privacy` — the shipped pages are accurate to the app's data flows but are drafts, not counsel.
11. Sentry (or similar) for error monitoring; UptimeRobot (free) for uptime.
12. Pick analytics (Plausible/PostHog) for the Phase 0 demand test — small wiring task once chosen.

**C. Validate, then launch**
13. Private beta (5–10 real wallets, 2–4 weeks): confirm Zerion coverage/accuracy, watch the daily cron write snapshots, run at least one real subscribe → cancel cycle.
14. Switch Stripe to live mode. Announce. Watch the waitlist and usage data to pick the first Phase 5 feature (PnL/cost basis is the leading candidate for the DeFi-native segment).
