import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/InfoPage";
import { OperatorContact, PendingLegalReview } from "@/components/LegalDraft";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern your use of Novafolio.",
};

export default function TermsPage() {
  return (
    <InfoPage title="Terms of Service" updated="October 23, 2026">
      <PendingLegalReview />
      <OperatorContact />
      <p>
        These terms govern your use of Novafolio (the
        &ldquo;Service&rdquo;), operated by Peter H. By connecting a wallet,
        signing in, or subscribing, you agree to them. If you don&apos;t agree,
        don&apos;t use the Service.
      </p>

      <h2>What the Service is — and isn&apos;t</h2>
      <p>
        The Service is a read-only portfolio viewer. It displays balances read
        from public blockchains and market data from third-party providers. It
        is <strong>non-custodial</strong>: it never holds your keys or funds,
        cannot move assets, and never asks you to sign a transaction that
        transfers value. Sign-in uses a signed message only.
      </p>

      <h2>No financial advice</h2>
      <p>
        Information in the Service is for informational purposes only. Nothing
        in the Service is financial, investment, legal, or tax advice, and
        using it does not create a fiduciary relationship, an advisory
        relationship, or any duty to you. Novafolio does not tell you to buy,
        sell, deposit, borrow, or hold any asset.
      </p>
      <p>
        Prices, yields (APY), TVL, health factors, true-yield sketches, and
        portfolio valuations are estimates. They come from third parties,
        including Alchemy, CoinGecko, and DeFiLlama, and from public chain
        reads. There is no warranty that this data is accurate, complete, or
        current. It can be delayed, missing, or wrong.
      </p>
      <p>
        You are responsible for your own decisions. DeFi carries a risk of
        loss, including loss of the entire amount you deposit. Past APY does not guarantee future returns.
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
          Automatic detection of tokens, Aave, Compound, and common staking
          tokens is part of the free service. It relies on third-party data and
          onchain reads, and it can miss or misprice a position. A true-yield
          figure is an estimate, not a quote.
        </li>
      </ul>

      <h2>Pro subscriptions</h2>
      <p>
        Pro is not currently offered for sale. Novafolio does not charge you to use
        the free tracker. If paid plans are introduced later, they will be billed
        through Stripe until canceled, and you will be able to cancel from the{" "}
        <Link href="/pricing">pricing page</Link>. Except where required by law,
        payments would be non-refundable.
      </p>

      <h2>Acceptable use</h2>
      <p>
        Don&apos;t abuse the Service: no scraping at scale, probing other
        users&apos; data, attempting to bypass entitlement checks, or using the
        Service for unlawful activity. Automated requests to the portfolio and
        price routes are rate limited.
      </p>

      <h2>Disclaimers and liability</h2>
      <p>
        The Service is provided &ldquo;as is&rdquo; without warranties of any
        kind. To the maximum extent permitted by law, the operator is not
        liable for losses arising from use of the Service, including losses
        caused by inaccurate data, downtime, or decisions made in reliance on
        displayed information.
      </p>

      <h2>Governing law</h2>
      <p>
        Governing law and venue have not been chosen. This paragraph is a
        placeholder pending legal review. It does not select a country, state,
        or court.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms or the Service itself. Material changes will
        be reflected by the &ldquo;last updated&rdquo; date above; continued
        use after a change constitutes acceptance.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms? Use the contact above, or see the{" "}
        <Link href="/support">support page</Link>.
      </p>
    </InfoPage>
  );
}
