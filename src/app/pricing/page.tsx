import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { ProCta } from "@/components/ProCta";

export const metadata: Metadata = {
  title: "Pricing — Base Wealth Tracker",
  description:
    "Track your Base portfolio free, or join the waitlist for Pro: automatic multi-chain detection, full synced history, and alerts.",
};

type Tier = {
  name: string;
  price: string;
  cadence?: string;
  tagline: string;
  features: string[];
  cta: string;
  highlight?: boolean;
};

const TIERS: Tier[] = [
  {
    name: "Free",
    price: "$0",
    tagline: "Everything you can build on free public data.",
    features: [
      "Connect a Coinbase wallet — no signup",
      "Live net worth for Base ETH + major ERC-20s",
      "Allocation breakdown and net-worth history",
      "DeFi pool explorer with manual position tracking",
      "Sign in to sync your data across devices",
    ],
    cta: "Open the app",
  },
  {
    name: "Pro",
    price: "$12",
    cadence: "/mo",
    tagline: "The complete picture, detected automatically.",
    features: [
      "Automatic detection of every token & LP/vault position",
      "Multi-chain — not just Base",
      "Continuous server-side history (no gaps when you're away)",
      "Price, APY and balance-move alerts",
      "PnL / cost-basis and CSV export",
    ],
    cta: "Join the waitlist",
    highlight: true,
  },
];

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
            B
          </span>
          <span className="text-sm font-semibold text-white">Base Wealth Tracker</span>
        </Link>
        <Link href="/" className="text-sm text-white/60 hover:text-white">
          ← Back to dashboard
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-12 px-6 py-12">
        <section className="flex flex-col items-center gap-3 text-center">
          <h1 className="text-3xl font-bold sm:text-4xl">
            Start free. Upgrade when you want the whole portfolio.
          </h1>
          <p className="max-w-2xl text-white/60">
            The free tier runs entirely on public data. Pro adds the thing that
            takes a paid indexer: automatic, complete, multi-chain detection of
            everything you hold.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`flex flex-col gap-5 rounded-2xl border p-6 ${
                tier.highlight
                  ? "border-accent bg-accent/5"
                  : "border-white/10 bg-surface"
              }`}
            >
              <div className="flex items-baseline justify-between">
                <h2 className="text-lg font-semibold">{tier.name}</h2>
                <p className="text-2xl font-bold">
                  {tier.price}
                  {tier.cadence ? (
                    <span className="text-sm font-normal text-white/50">
                      {tier.cadence}
                    </span>
                  ) : null}
                </p>
              </div>
              <p className="text-sm text-white/60">{tier.tagline}</p>
              <ul className="flex flex-1 flex-col gap-2.5 text-sm">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex gap-2.5">
                    <span
                      aria-hidden
                      className={tier.highlight ? "text-accent" : "text-emerald-400"}
                    >
                      ✓
                    </span>
                    <span className="text-white/80">{feature}</span>
                  </li>
                ))}
              </ul>
              {tier.highlight ? (
                <ProCta />
              ) : (
                <Link
                  href="/"
                  className="rounded-lg border border-white/15 px-4 py-2.5 text-center text-sm font-medium text-white/80 hover:border-white/30 hover:text-white"
                >
                  {tier.cta}
                </Link>
              )}
            </div>
          ))}
        </section>

        <p className="text-center text-xs text-white/40">
          Indicative pricing for a demand test — not a live checkout. Base Wealth
          Tracker is a portfolio tool, not financial advice.
        </p>
      </main>

      <Footer />
    </div>
  );
}
