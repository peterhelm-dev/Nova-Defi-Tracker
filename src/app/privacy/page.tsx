import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/InfoPage";
import { OperatorContact, PendingLegalReview } from "@/components/LegalDraft";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What Novafolio stores, where, and why.",
};

export default function PrivacyPage() {
  return (
    <InfoPage title="Privacy Policy" updated="October 24, 2026">
      <PendingLegalReview />
      <OperatorContact />
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
        <li>dashboard layout, balance view, currency display, and color theme,</li>
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
        <li>dashboard and Research preferences, including the color theme,</li>
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
          <strong>Analytics</strong> — Vercel Web Analytics counts page views
          without cookies and without advertising. It does not receive your
          wallet address. Wallet-connect telemetry to Coinbase is turned off.
          If a Plausible domain is set, that cookie-less counter loads as well.
        </li>
        <li>
          <strong>Health-factor email</strong> — if you confirm an alert, Resend
          receives your email, the wallet address, and the health factor so it
          can deliver the message. The email is not sent to Alchemy. Upstash
          Redis stores the alert when that store is configured.
        </li>
      </ul>

      <h2>Host and logs</h2>
      <p>
        Novafolio is hosted on Vercel. The host and this app may keep
        short-lived request logs: time, path, status, and IP address. Those
        logs operate the service, apply rate limits, and investigate abuse.
        They are not sold and are not used for advertising. Vercel keeps its
        own logs under its policy.
      </p>
      <p>
        Alchemy-backed routes count requests per IP address for about one
        minute. That counter lives in the memory of the server handling the
        request, or in Upstash Redis when that optional store is configured.
        The wallet address is not part of the counter.
      </p>

      <h2>Health factor alerts</h2>
      <p>
        You can ask for an email when an Aave or Compound health factor drops
        below a number you choose. No account is required. Nothing is emailed
        until you open the confirmation link, and every email has an unsubscribe
        link. For that alert we store the wallet address, the threshold, and the
        email, plus a random confirmation token (stored only as a hash) and an
        unsubscribe token so later messages can include the same link. The daily
        check sends the wallet address to Alchemy or a public RPC, the same way
        a portfolio view does. The email address stays with Novafolio and, when
        delivery is on, with Resend. The record is kept in Upstash Redis when
        that is configured, otherwise in the account database, otherwise only in
        a local file during development. Unsubscribing deletes it. You can also
        ask for it to be deleted.
      </p>

      <h2>Waitlist</h2>
      <p>
        If you join the Pro waitlist we store the email you submit, solely to
        contact you about Pro. Ask us to delete it at any time.
      </p>

      <h2>Retention</h2>
      <p>
        Data in this browser stays until you clear it. Server account data, when
        sign-in is enabled, is kept while the account exists. A waitlist email
        is kept until you ask for it to be deleted. A health-factor alert is
        kept until you unsubscribe or ask for it to be deleted. Rate-limit counters expire
        after about a minute. Request logs last only as long as the host retains
        them.
      </p>

      <h2>Your rights</h2>
      <p>
        You can see, correct, or delete account data tied to your wallet, and
        you can stop using Novafolio at any time. Data stored only in this
        browser is under your control. To ask about server-side data, contact
        the operator with a message signed by the wallet in question. Novafolio
        is not directed at children.
      </p>

      <h2>Deletion</h2>
      <p>
        To have your server-side data deleted, use the contact above or the{" "}
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
