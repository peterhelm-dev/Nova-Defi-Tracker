import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/InfoPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What Novafolio stores, where, and why.",
};

export default function PrivacyPage() {
  return (
    <InfoPage title="Privacy Policy" updated="October 22, 2026">
      <p>
        Novafolio is built to need as little of your data as
        possible. No email or password is required to use it, and there is no
        advertising or cross-site tracking. This page describes what is
        stored, where, and why. Wallet addresses are already public onchain.
      </p>

      <h2>In this browser</h2>
      <p>
        Until you sign in, and on any deployment without an account database,
        Novafolio keeps your choices in <code>localStorage</code> on your device:
      </p>
      <ul>
        <li>wallet addresses you paste, plus any nickname you give them,</li>
        <li>dashboard layout, balance view, and currency display,</li>
        <li>tokens and pools you save in Research,</li>
        <li>DeFi positions you track by hand,</li>
        <li>net-worth snapshots taken while this browser has the app open,</li>
        <li>whether sound, the tour, and privacy mode are on.</li>
      </ul>
      <p>Clearing browser storage erases that. We do not receive it.</p>

      <h2>When you sign in</h2>
      <p>
        Signing in is optional. It uses a signed message (Sign-In With Ethereum)
        and, only when this deployment has a database, creates an account keyed
        to your <strong>wallet address</strong>. That address is the identifier.
        Associated with it, the server can store:
      </p>
      <ul>
        <li>daily net-worth snapshots (dates and USD totals),</li>
        <li>DeFi positions you track manually,</li>
        <li>dashboard and Research preferences,</li>
        <li>price-alert rules you create, and alerts that have fired,</li>
        <li>
          subscription state if a paid plan is ever offered (plan, status, and
          Stripe customer/subscription IDs — never card details).
        </li>
      </ul>
      <p>
        Without a database, sign-in is refused and nothing above is written on
        the server. Sessions use a signed, http-only cookie containing your
        wallet address and an expiry. We never see or store your private keys,
        and the app never asks you to sign a transaction.
      </p>

      <h2>Third parties</h2>
      <ul>
        <li>
          <strong>Chain reads</strong> — balances, Aave and Compound positions,
          staking tokens, allowances, and gas prices send the wallet address to
          Alchemy when that key is set, otherwise to public RPC endpoints, on
          Ethereum, Base, Arbitrum, Optimism, Polygon, BNB Chain, and Avalanche.
        </li>
        <li>
          <strong>Transfers</strong> — recent activity and the gas report send
          the address to Alchemy. They are not requested when that key is absent.
        </li>
        <li>
          <strong>Prices and pools</strong> — Alchemy Prices, CoinGecko, and
          DeFiLlama are queried for market-wide data. Your address is not sent
          to CoinGecko or DeFiLlama.
        </li>
        <li>
          <strong>revoke.cash</strong> — approval links open that site with the
          address and chain in the URL. Novafolio does not call revoke.cash itself.
        </li>
        <li>
          <strong>Payments</strong> — Stripe is unused unless a paid plan is
          turned on. If it is, Stripe holds payment details under its own policy.
        </li>
        <li>
          <strong>Analytics</strong> — if enabled, we use cookie-less Plausible,
          which counts aggregate page views and does not identify you.
        </li>
      </ul>

      <h2>Waitlist</h2>
      <p>
        If you join the Pro waitlist we store the email you submit, solely to
        contact you about Pro. Ask us to delete it at any time.
      </p>

      <h2>Retention and deletion</h2>
      <p>
        Account data is kept while the account is active. To have your
        server-side data deleted, contact us via the{" "}
        <Link href="/support">support page</Link> with a message signed by the
        wallet in question, and we&apos;ll remove it.
      </p>

      <h2>Changes</h2>
      <p>
        If our data practices change, this page and its &ldquo;last
        updated&rdquo; date will change with them.
      </p>
    </InfoPage>
  );
}
