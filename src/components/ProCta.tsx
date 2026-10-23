"use client";

import { useState } from "react";
import Link from "next/link";
import { useBilling } from "@/hooks/useBilling";
import { WaitlistForm } from "./WaitlistForm";

/**
 * Pro stays dormant until Stripe and a database are both configured.
 * Until then the only action is the waitlist — and only when emails can
 * actually be stored.
 */
export function ProCta({
  billingLive,
  waitlistOpen,
}: {
  billingLive: boolean;
  waitlistOpen: boolean;
}) {
  const billing = useBilling();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setBusy(false);
    }
  }

  if (!billingLive) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-text-secondary">
          Pro is coming soon. It is not for sale, and Novafolio will not take a payment.
          Join the waitlist if you want a note when that changes.
        </p>
        {waitlistOpen ? (
          <WaitlistForm />
        ) : (
          <p className="text-sm text-text-muted">
            The waitlist is closed on this deployment because there is no database
            to store emails. Novafolio will not pretend to collect them.
          </p>
        )}
      </div>
    );
  }

  if (!billing.isSignedIn) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-xs text-text-muted">
          Connect your wallet and{" "}
          <Link href="/" className="text-accent hover:underline">
            sign in
          </Link>{" "}
          to subscribe.
        </p>
      </div>
    );
  }

  if (billing.isLoading) {
    return <p className="text-sm text-text-muted">Checking your plan…</p>;
  }

  if (billing.entitled) {
    return (
      <div className="flex flex-col gap-2">
        <p className="flex items-center gap-1.5 text-sm font-medium text-positive">
          <span className="h-1.5 w-1.5 rounded-full bg-positive" />
          Pro is active
          {billing.cancelAtPeriodEnd ? " — cancels at period end" : ""}
        </p>
        {billing.hasSubscription ? (
          <button
            type="button"
            onClick={() => run(billing.openPortal)}
            disabled={busy}
            className="rounded-lg border border-border-subtle px-4 py-2.5 text-sm font-medium text-foreground hover:border-border-strong hover:text-foreground disabled:opacity-60"
          >
            {busy ? "Opening…" : "Manage subscription"}
          </button>
        ) : null}
        {error ? <p className="text-sm text-negative">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => run(billing.startCheckout)}
        disabled={busy}
        className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-text-inverse hover:bg-accent/90 disabled:opacity-60"
      >
        {busy ? "Redirecting…" : "Upgrade to Pro"}
      </button>
      {error ? <p className="text-sm text-negative">{error}</p> : null}
    </div>
  );
}
