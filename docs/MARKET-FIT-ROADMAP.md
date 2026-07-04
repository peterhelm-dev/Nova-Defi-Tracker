# Base Wealth Tracker — Market-Fit Roadmap

_Last updated: 2026-06-30_

> **Implementation status:** Phase 0 (demand test) and Phase 1 (backend +
> accounts) are landed in code:
> - Sign-In With Ethereum, stateless HMAC sessions, smart-wallet-aware verify.
> - Server-side `UserDataStore` with **two** backends — a file store (default)
>   and a **Postgres** adapter (`src/lib/server/postgresStore.ts`, schema in
>   `migrations/001_init.sql`) selected automatically when `DATABASE_URL` is set.
> - Cross-device sync for net-worth history and tracked positions, with a
>   localStorage guest fallback.
> - **Scheduled daily snapshot job** (`/api/cron/snapshot`, wired via
>   `vercel.json`) that recomputes each tracked wallet's net worth server-side
>   so history accrues even when the user isn't visiting.
> - `/pricing` page with a waitlist.
>
> Phase 1 is functionally complete; the remaining production step is purely
> operational — provision a Postgres database, apply the migration, and set
> `DATABASE_URL` / `CRON_SECRET`.
>
> **Phase 2 (auto-detection)** has a working first slice landed too: a
> portfolio-provider seam (`src/lib/server/portfolio/`) with a Zerion adapter,
> a `/api/portfolio` route scoped to the signed-in wallet, and dashboard wiring
> that switches from the curated Base flow to automatic, complete, multi-chain
> detection (tokens + DeFi positions) when `ZERION_API_KEY` is set and the user
> is entitled. Multi-chain rides along for free via the indexer. A lightweight
> entitlement seam (`isPro` / `PRO_ADDRESSES`) is in place for Phase 3 billing
> to fill. Remaining Phase 2 work is operational + hardening: obtain a real key,
> verify the mapper against live responses, and tune coverage. See §3.
>
> **Phase 3 (billing)** is landed: Stripe Checkout + Billing Portal + a
> signature-verified webhook (`/api/billing/*`), subscription state persisted in
> the store (`migrations/002_subscriptions.sql`), and the entitlement seam now
> enforced server-side from live subscription state (`isEntitledPro`). The
> pricing page CTA adapts (upgrade → manage, waitlist fallback). Remaining is
> operational: set the Stripe keys/price/webhook and create the Stripe product.
>
> **Phase 4 (trust & legitimacy)** is landed: `/terms` (with the "not financial
> advice" disclaimer), `/privacy` (matching actual data flows), `/support` with
> FAQ + contact, footer legal links, route/global error boundaries + custom
> 404, and baseline security headers. Remaining before charging real money:
> legal review of the pages, a monitored support mailbox
> (`NEXT_PUBLIC_SUPPORT_EMAIL`), an error-monitoring SDK (the boundary is the
> hook point), and uptime monitoring. Next: **Phase 5 (differentiation)** —
> PnL/cost basis, alerts, exports — guided by what waitlist/usage data says.
>
> **Phase 5 first slice:** CSV export of net-worth history and holdings is
> shipped (free tier — it exports data the user already sees). PnL/cost-basis
> and tax-ready exports remain the Pro-grade export promise.
>
> **Phase 5 second slice + Phase 0 wiring:** a Performance card (1d/7d/30d/
> all-time returns computed from the daily snapshot series, with CSV export)
> now sits on the dashboard — the first step toward full PnL/cost-basis, which
> still needs acquisition-price history from an indexer. Optional cookie-less
> analytics (Plausible) load when `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` is set,
> completing the Phase 0 measurement loop; the privacy page discloses it.

This document assesses where the app is today and lays out a phased path from
"working demo" to a product that can be legitimately sold. It exists because
the four things that block monetization — automatic portfolio detection, a
real backend with accounts, billing, and a trust/legitimacy layer — are all
needed, and the order they're built in matters.

---

## 1. Where the app actually is today

**Verdict: a well-engineered MVP / personal tool. Not yet a sellable product.**

The engineering is genuinely good for its size (~1,660 LOC):

- Next.js 16 App Router + TypeScript, OnchainKit / wagmi / viem for wallet +
  onchain reads, TanStack Query for caching, Recharts for charts.
- Typed throughout (`src/types/index.ts`), unit-tested (Vitest on `src/lib`
  and hooks) and e2e-tested (Playwright on empty-wallet + pools flows), with
  CI running lint/build/unit/e2e on every push.
- Server-side API routes (`/api/prices`, `/api/defi-pools`) proxy and cache
  CoinGecko and DeFiLlama, so the client never hits those APIs directly.

What it does: connect a Coinbase wallet → live net worth from ETH + 9
hardcoded Base ERC-20s → a localStorage history chart → an allocation pie →
a DeFiLlama pool explorer where positions are tracked **manually**.

### The structural gaps between "works" and "sellable"

| Area | Today | Gap for a paid product |
|---|---|---|
| Accounts / identity | Wallet-connect only | No login, no email, no cross-device identity |
| Data persistence | `localStorage` only (`src/lib/storage.ts`) | History dies on cache-clear; no sync; no backend exists |
| Monetization | None | No billing, plans, paywall, or license enforcement |
| Asset coverage | 9 hardcoded tokens (`src/lib/tokens.ts`) + manual DeFi | Misses most holdings; competitors auto-detect everything |
| Chains | Base only (by design) | Most users hold assets across many chains |
| Trust / legitimacy | No ToS, privacy, support, or brand | Can't charge money without these |
| Differentiation | Generic vs. free incumbents | No clear reason to pay over Zapper / DeBank free tiers |

### The core strategic tension

The README is upfront: the app deliberately avoids paid indexers (Zapper,
DeBank, Zerion, Covalent) to stay on free public APIs. But **automatic,
complete, multi-chain portfolio detection is exactly the feature people pay
for.** Monetizing almost certainly means crossing that line — which forces a
backend, paid data, and billing. That decision cascades through everything
below.

---

## 2. Go-to-market: which customer?

The target buyer is still open. The three viable paths, with an honest read:

### Option A — Retail crypto users (B2C SaaS)
Individual holders paying ~$5–15/mo for a nicer tracker.
- **Pro:** Largest market, simplest to reason about.
- **Con:** Brutal competition. Zapper, DeBank, Zerion all have strong free
  tiers. "Base-only, manual DeFi" is a hard sell here without a real edge.
- **Needs to win:** A genuine differentiator (see §5), not just polish.

### Option B — Power users / DeFi natives (premium niche)
Smaller, high-value audience paying $20–50/mo for analytics, PnL, tax lots,
and alerts.
- **Pro:** Willing to pay; less price-sensitive; clearer value (time saved,
  tax/PnL correctness).
- **Con:** Demanding; expects accuracy, coverage, and depth.
- **Needs to win:** Cost-basis / realized-PnL, transaction history, alerts.

### Option C — B2B / white-label
License the tracker to wallets, protocols, or fintechs to embed.
- **Pro:** Few customers, large contracts, less marketing.
- **Con:** Long sales cycles; needs SLAs, theming/embed, an API, support.
- **Needs to win:** Reliability + integration surface, not consumer polish.

**Recommendation to de-risk the choice:** Build the Phase 1–2 foundation
(which every path needs anyway), then run a cheap demand test — a landing page
with a waitlist and a "Pro" pricing CTA — pointed at the **DeFi-native niche
(Option B)** first. It's the most defensible against free incumbents and the
existing DeFi-pool feature is a natural wedge. Treat the target as a
hypothesis to validate, not a guess to commit to.

---

## 3. Phased roadmap

Each phase is shippable and ordered by dependency. Effort is rough
calendar estimate for one focused developer; treat as relative sizing.

### Phase 0 — Decide & instrument _(days)_
You can't iterate toward fit blind.
- Pick the **initial** target hypothesis (recommend Option B).
- Add privacy-respecting product analytics (e.g. PostHog/Plausible) to learn
  what people actually use.
- Stand up a landing page + waitlist + a fake "Pro" pricing button to measure
  intent before building billing.
- **Exit:** You have a target hypothesis and a way to measure demand and usage.

### Phase 1 — Backend + real accounts _(2–4 weeks)_ — **foundation**
Nothing else (sync, billing, server-side detection) works without this.
- Add a database (Postgres via Supabase/Neon) and an auth layer. Wallet
  signature ("Sign-In With Ethereum") + optional email is the natural fit and
  keeps the no-friction feel.
- Migrate net-worth history and tracked DeFi positions off `localStorage`
  (`useNetWorthHistory`, `useTrackedPositions`, `src/lib/storage.ts`) into the
  DB, keyed to the account. Keep localStorage as an offline fallback / guest
  mode so the current zero-signup experience still works.
- Add server-side snapshotting: a scheduled job records daily net worth so
  history is real and continuous even when the user isn't visiting — removing
  the current "no history before you first opened the app" limitation.
- **Exit:** A logged-in user's data survives a cache clear and syncs across
  devices; history accrues server-side.

### Phase 2 — Auto portfolio detection _(2–4 weeks)_ — **the paid value**
This is what converts free users to paying ones.
- Integrate a portfolio/indexer API (Zapper, DeBank, Covalent, or Alchemy
  Portfolio) behind the existing server routes, so keys stay server-side and
  the client contract barely changes.
- Replace the 9-token hardcoded list and the manual "Track" flow with
  automatic detection of all tokens **and** LP/vault positions for a connected
  wallet. Keep manual tracking as a fallback for anything the indexer misses.
- This is the obvious **free vs. Pro** line: manual + Base-only stays free;
  automatic, complete detection is paid.
- **Exit:** Connect a wallet and your real, complete holdings appear with no
  manual entry.

> **Multi-chain** rides along here: most indexer APIs are multi-chain, so
> expanding beyond Base becomes mostly a data/display change once detection is
> server-side. Sequence it right after single-chain auto-detection is solid.

### Phase 3 — Billing / subscriptions _(1–2 weeks)_
Only meaningful once there's a paid feature (Phase 2) to gate.
- Stripe for cards (broadest reach); optionally onchain/crypto payment as a
  fitting secondary for this audience.
- Define tiers (suggested): **Free** = current Base-only manual experience;
  **Pro** = auto-detection, multi-chain, full history, alerts.
- Enforce entitlements server-side (never trust the client for paywalling),
  wire up the checkout, customer portal, and webhook-driven plan state.
- **Exit:** A user can upgrade, get Pro features, manage/cancel their plan,
  and entitlements are enforced on the server.

### Phase 4 — Trust & legitimacy _(1–2 weeks, partly parallel)_
Required before charging real money; some of it (legal pages) should land as
soon as Phase 1 collects any user data.
- Legal: Terms of Service, Privacy Policy, and a clear "not financial advice"
  disclaimer. **Land the privacy policy the moment you start storing user
  data in Phase 1.**
- Support: a contact/support channel and a basic help/FAQ.
- Brand & onboarding: real name/logo, a first-run walkthrough, and an empty
  state that sells the value.
- Reliability: error monitoring (Sentry), graceful degradation when CoinGecko/
  DeFiLlama/the indexer is down (the routes already return 502 cleanly — build
  on that), and uptime monitoring.
- Mobile/responsive QA — portfolio trackers are checked constantly on phones.
- **Exit:** A stranger can trust it with a wallet connection and pay for it.

### Phase 5 — Differentiation & retention _(ongoing)_
Polish doesn't beat free incumbents; a real edge does. Pick based on the
validated audience:
- **PnL / cost basis / tax lots** — highest value for Option B; hard for free
  tiers to match well.
- **Alerts** — price, APY changes, large balance moves, impermanent-loss
  warnings on tracked pools.
- **Base-native depth** — lean into being the best *Base* tracker
  (ecosystem tokens, Base-specific yields) rather than a worse general one.
- **Shareable/export** — portfolio snapshots, CSV/tax export.

---

## 4. Dependency map (build order matters)

```
Phase 0 (decide + measure)
        │
        ▼
Phase 1 (backend + accounts) ──────────────► Phase 4 (legal/privacy starts here)
        │
        ▼
Phase 2 (auto-detection + multi-chain)  ← the thing people pay for
        │
        ▼
Phase 3 (billing) ── gates Phase 2 behind a paywall
        │
        ▼
Phase 5 (differentiation / retention) ── ongoing
```

The trap to avoid: building billing (Phase 3) or chasing polish (Phase 4)
**before** there's a paid-grade feature (Phase 2) and the backend (Phase 1) to
support it. Money follows value; value here is automatic, complete portfolio
detection on a foundation that persists.

---

## 5. The one-line strategic summary

The app is a strong MVP whose deliberate cost-saving choice — no paid indexer,
no backend — is precisely the wall between it and being sellable. The path to
revenue is: **stand up a backend, add automatic multi-chain portfolio
detection as the paid tier, gate it with billing, wrap it in the legal/trust
layer, and validate the DeFi-native niche first.** Everything else is
sequencing.

---

## 6. Recommended immediate next steps

1. Confirm the **initial target hypothesis** (recommend DeFi-native, Option B).
2. Ship the **Phase 0** landing page + waitlist + analytics to measure demand
   cheaply before heavy build.
3. Begin **Phase 1** (database + auth + migrate persistence off localStorage) —
   it unblocks everything and is valuable even if the GTM target shifts.
