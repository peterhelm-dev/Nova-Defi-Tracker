import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/InfoPage";

export const metadata: Metadata = {
  title: "Support",
  description: "Get help with Novafolio: FAQ and contact.",
};

const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: "Is this safe? Can it touch my funds?",
    a: "No. The app is read-only and non-custodial: it never has your keys, never asks you to sign a transaction that moves value, and sign-in is just a signed message proving you own the address.",
  },
  {
    q: "My balance or a token is missing.",
    a: "With an Alchemy key, Novafolio lists the tokens that indexer returns on Ethereum, Base, Arbitrum, Optimism, Polygon, BNB Chain, and Avalanche. Without that key, only native coins and a short list of major tokens are read, so other balances stay hidden. Aave v3 supply and borrow, Compound v3, and common staking tokens are read on-chain and shown as positions, so those receipt tokens are not also counted as cash. Anything else is still manual. Solana isn't included.",
  },
  {
    q: "Where is my history stored?",
    a: "Not signed in: in your browser only (localStorage), so clearing storage erases it. Signed in: on our servers keyed to your wallet address, synced across devices, with a daily server-side snapshot even when you don't visit.",
  },
  {
    q: "How do I cancel Pro?",
    a: (
      <>
        Pro is not for sale, so there is nothing to cancel. If a paid plan
        launches later, cancellation will be on the{" "}
        <Link href="/pricing">pricing page</Link>.
      </>
    ),
  },
  {
    q: "A price or APY looks wrong.",
    a: "Prices come from CoinGecko. Pool TVL and APY come from a yields source and hide with a short note when that source is down. Token pages keep working. Pro holdings come from a portfolio indexer. All can lag. Treat every number as an estimate, not an oracle.",
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
  const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;

  return (
    <InfoPage title="Support">
      <p>
        Stuck, found a bug, or missing a feature? Check the FAQ below — if that
        doesn&apos;t cover it
        {email ? (
          <>
            , email <a href={`mailto:${email}`}>{email}</a> and include your
            wallet address
          </>
        ) : (
          <>
            , a support email is not published on this deployment yet. Check
            back after the operator sets one
          </>
        )}{" "}
        (never send keys or a seed phrase; Novafolio will never ask for them).
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
