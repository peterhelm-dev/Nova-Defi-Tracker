import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { Footer } from "@/components/Footer";
import { ProCta } from "@/components/ProCta";
import { isProForSale } from "@/lib/server/billing";
import { isAccountSyncAvailable, isDurableStoreAvailable } from "@/lib/server/persistence";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Novafolio's tracker is free, including detected lending and staking. Pro is not for sale.",
};

export default function PricingPage() {
  const billingLive = isProForSale();
  const waitlistOpen = isDurableStoreAvailable();
  const syncOn = isAccountSyncAvailable();

  const freeFeatures = [
    "Connect Coinbase, MetaMask, or Rabby — no account required",
    "Watch extra wallets by pasting an address or ENS name",
    "Token balances across Ethereum, Base, Arbitrum, Optimism, Polygon, BNB Chain, and Avalanche",
    "Aave v3, Compound v3, and common staking tokens read onchain, plus manual tracking for anything else",
    "Research with a true-yield estimate and a before-you-deposit checklist",
    "Open token approvals, dust, and recent gas when an Alchemy key is set",
    syncOn
      ? "Sign in to sync tracked positions across devices"
      : "Portfolio stays in this browser until a database is connected",
    "CSV export of holdings and tracked positions",
  ];

  const proFeatures = [
    "Daily server-side history while you're away, once a database is connected",
    "Price alerts that keep running after you close the tab",
    "Synced preferences across devices",
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-6">
        <BrandMark />
        <Link href="/" className="text-sm text-white/60 hover:text-white">
          ← Back
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-12 px-4 py-12 sm:px-6">
        <section className="flex flex-col items-center gap-3 text-center">
          <h1 className="text-3xl font-bold sm:text-4xl">Free to use. Pro is not for sale.</h1>
          <p className="max-w-2xl text-white/60">
            The tracker runs on free public data and a free Alchemy key. Pro stays in the
            code until there is a reason to charge for it. Nothing here is financial advice.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-5 rounded-2xl border border-white/10 bg-surface p-6">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold">Free</h2>
              <p className="text-2xl font-bold">$0</p>
            </div>
            <p className="text-sm text-white/60">What you can use today.</p>
            <ul className="flex flex-1 flex-col gap-2.5 text-sm">
              {freeFeatures.map((feature) => (
                <li key={feature} className="flex gap-2.5">
                  <span aria-hidden className="text-emerald-400">
                    ✓
                  </span>
                  <span className="text-white/80">{feature}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/"
              className="rounded-lg border border-white/15 px-4 py-2.5 text-center text-sm font-medium text-white/80 hover:border-white/30 hover:text-white"
            >
              Open the app
            </Link>
          </div>

          <div className="flex flex-col gap-5 rounded-2xl border border-accent bg-accent/5 p-6">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold">Pro</h2>
              {billingLive ? (
                <p className="text-2xl font-bold">
                  $12
                  <span className="text-sm font-normal text-white/50">/mo</span>
                </p>
              ) : (
                <p className="text-right text-sm font-semibold text-accent">
                  Coming soon
                  <span className="mt-1 block text-xs font-normal text-white/50">
                    Planned around $12/mo · not for sale
                  </span>
                </p>
              )}
            </div>
            <p className="text-sm text-white/60">
              {billingLive
                ? "The complete picture, when you choose to pay."
                : "Listed so you can see the plan. There is no checkout."}
            </p>
            <ul className="flex flex-1 flex-col gap-2.5 text-sm">
              {proFeatures.map((feature) => (
                <li key={feature} className="flex gap-2.5">
                  <span aria-hidden className="text-accent">
                    ✓
                  </span>
                  <span className="text-white/80">{feature}</span>
                </li>
              ))}
            </ul>
            <ProCta billingLive={billingLive} waitlistOpen={waitlistOpen} />
          </div>
        </section>

        <p className="text-center text-xs text-text-muted">
          {billingLive
            ? "Pro is billed by Stripe. Cancel any time from this page."
            : "Pro is not for sale on this deployment."}{" "}
          Novafolio is a portfolio tool, not financial advice.
        </p>
      </main>

      <Footer />
    </div>
  );
}
