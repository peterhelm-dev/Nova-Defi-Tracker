import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/InfoPage";

export const metadata: Metadata = {
  title: "Terms of Service — NOVA",
  description: "The terms that govern your use of NOVA.",
};

export default function TermsPage() {
  return (
    <InfoPage title="Terms of Service" updated="June 30, 2026">
      <p>
        These terms govern your use of NOVA (the
        &ldquo;Service&rdquo;). By connecting a wallet, signing in, or
        subscribing, you agree to them. If you don&apos;t agree, don&apos;t use
        the Service.
      </p>

      <h2>What the Service is — and isn&apos;t</h2>
      <p>
        The Service is a read-only portfolio viewer. It displays balances read
        from public blockchains and market data from third-party providers. It
        is <strong>non-custodial</strong>: it never holds your keys or funds,
        cannot move assets, and never asks you to sign a transaction that
        transfers value. Sign-in uses a signed message only.
      </p>

      <h2>Not financial advice</h2>
      <p>
        Nothing in the Service is investment, financial, legal, or tax advice.
        Prices, yields (APY), TVL, and portfolio valuations are estimates
        sourced from third parties, can be delayed, incomplete, or wrong, and
        must not be relied on for trading decisions. Crypto assets are
        volatile; you alone are responsible for your decisions.
      </p>

      <h2>Accounts and accuracy</h2>
      <ul>
        <li>
          Signing in with your wallet creates an account keyed to that wallet
          address. You are responsible for the wallet and its security.
        </li>
        <li>
          Manually tracked DeFi positions are self-reported by you; the Service
          displays what you enter and does not verify it.
        </li>
        <li>
          Automatic detection (Pro) relies on third-party indexers and may miss
          or misprice positions.
        </li>
      </ul>

      <h2>Pro subscriptions</h2>
      <p>
        Paid plans are billed through Stripe on a recurring basis until
        canceled. You can cancel any time from the billing portal on the{" "}
        <Link href="/pricing">pricing page</Link>; access continues to the end
        of the paid period. Except where required by law, payments are
        non-refundable.
      </p>

      <h2>Acceptable use</h2>
      <p>
        Don&apos;t abuse the Service: no scraping at scale, probing other
        users&apos; data, attempting to bypass entitlement checks, or using the
        Service for unlawful activity.
      </p>

      <h2>Disclaimers and liability</h2>
      <p>
        The Service is provided &ldquo;as is&rdquo; without warranties of any
        kind. To the maximum extent permitted by law, the operator is not
        liable for losses arising from use of the Service, including losses
        caused by inaccurate data, downtime, or decisions made in reliance on
        displayed information.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms or the Service itself. Material changes will
        be reflected by the &ldquo;last updated&rdquo; date above; continued
        use after a change constitutes acceptance.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms? See the{" "}
        <Link href="/support">support page</Link>.
      </p>
    </InfoPage>
  );
}
