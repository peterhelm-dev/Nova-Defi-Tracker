import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/InfoPage";

export const metadata: Metadata = {
  title: "Support — Base Wealth Tracker",
  description: "Get help with Base Wealth Tracker: FAQ and contact.",
};

const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: "Is this safe? Can it touch my funds?",
    a: "No. The app is read-only and non-custodial: it never has your keys, never asks you to sign a transaction that moves value, and sign-in is just a signed message proving you own the address.",
  },
  {
    q: "My balance or a token is missing.",
    a: "The free tier reads a curated list of major Base tokens. Pro auto-detection covers every token and DeFi position across chains — see the pricing page. If Pro misses something, tell us and we'll chase it with the data provider.",
  },
  {
    q: "Where is my history stored?",
    a: "Not signed in: in your browser only (localStorage), so clearing storage erases it. Signed in: on our servers keyed to your wallet address, synced across devices, with a daily server-side snapshot even when you don't visit.",
  },
  {
    q: "How do I cancel Pro?",
    a: (
      <>
        Open <Link href="/pricing">the pricing page</Link> while signed in and
        choose &ldquo;Manage subscription&rdquo; — it takes you to the Stripe
        billing portal where you can cancel. Access runs to the end of the paid
        period.
      </>
    ),
  },
  {
    q: "A price or APY looks wrong.",
    a: "Prices come from CoinGecko, pool data from DeFiLlama, and Pro holdings from a portfolio indexer. All can lag or disagree with an exchange. Treat every number as an estimate, not an oracle.",
  },
  {
    q: "How do I delete my data?",
    a: (
      <>
        Guest data: clear your browser storage. Account data: contact us (below)
        from a message signed by your wallet and we&apos;ll delete everything
        tied to the address, per the <Link href="/privacy">privacy policy</Link>.
      </>
    ),
  },
];

export default function SupportPage() {
  const email =
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@basewealthtracker.app";

  return (
    <InfoPage title="Support">
      <p>
        Stuck, found a bug, or missing a feature? Check the FAQ below — if that
        doesn&apos;t cover it, email{" "}
        <a href={`mailto:${email}`}>{email}</a> and include your wallet address
        (never your keys or seed phrase; we will never ask for them).
      </p>

      <h2>Frequently asked questions</h2>
      <div className="flex flex-col gap-3">
        {FAQ.map(({ q, a }) => (
          <details
            key={q}
            className="group rounded-xl border border-white/10 bg-surface px-4 py-3"
          >
            <summary className="cursor-pointer list-none text-sm font-medium text-white/90 group-open:mb-2">
              {q}
            </summary>
            <div className="text-sm text-white/60">{a}</div>
          </details>
        ))}
      </div>

      <h2>Legal</h2>
      <p>
        <Link href="/terms">Terms of Service</Link> ·{" "}
        <Link href="/privacy">Privacy Policy</Link>
      </p>
    </InfoPage>
  );
}
