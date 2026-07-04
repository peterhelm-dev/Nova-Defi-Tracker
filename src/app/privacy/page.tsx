import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/InfoPage";

export const metadata: Metadata = {
  title: "Privacy Policy — Base Wealth Tracker",
  description: "What Base Wealth Tracker stores, where, and why.",
};

export default function PrivacyPage() {
  return (
    <InfoPage title="Privacy Policy" updated="June 30, 2026">
      <p>
        Base Wealth Tracker is built to need as little of your data as
        possible. No email or password is required to use it, and there is no
        advertising or cross-site tracking. This page describes exactly what is
        stored, where, and why.
      </p>

      <h2>Guest mode (not signed in)</h2>
      <p>
        Everything stays in your browser. Net-worth history and manually
        tracked positions live in <code>localStorage</code> on your device; we
        store nothing about you on our servers. Clearing browser storage erases
        this data.
      </p>

      <h2>When you sign in</h2>
      <p>
        Signing in with your wallet (Sign-In With Ethereum) creates an account
        keyed to your <strong>wallet address</strong> — that address is the
        only identifier we hold. We then store, associated with it:
      </p>
      <ul>
        <li>daily net-worth snapshots (dates and USD totals),</li>
        <li>DeFi positions you track manually,</li>
        <li>
          subscription state if you buy Pro (plan, status, and Stripe
          customer/subscription IDs — never card details).
        </li>
      </ul>
      <p>
        Sessions use a signed, http-only cookie containing your wallet address
        and an expiry. We never see or store your private keys.
      </p>

      <h2>Third parties</h2>
      <ul>
        <li>
          <strong>Blockchain RPC</strong> — reading balances sends your wallet
          address to a Base RPC endpoint (Coinbase&apos;s or a public one).
        </li>
        <li>
          <strong>Price &amp; pool data</strong> — CoinGecko and DeFiLlama are
          queried by our server for market-wide data; your address is not sent
          to them.
        </li>
        <li>
          <strong>Portfolio detection (Pro)</strong> — your wallet address is
          sent to the configured portfolio indexer (e.g. Zerion) to detect your
          holdings. Wallet addresses are public on-chain data by nature.
        </li>
        <li>
          <strong>Payments</strong> — Stripe processes payments and holds your
          payment details under its own privacy policy.
        </li>
        <li>
          <strong>Analytics</strong> — if enabled, we use cookie-less,
          privacy-respecting analytics (Plausible) that counts aggregate page
          views only; it does not identify you or follow you across sites.
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
