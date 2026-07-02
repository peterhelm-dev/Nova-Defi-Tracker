"use client";

import { useState } from "react";
import Link from "next/link";
import { useBilling } from "@/hooks/useBilling";
import { WaitlistForm } from "./WaitlistForm";

/**
 * The Pro tier's call to action, adapting to billing state:
 * - not signed in            → sign-in prompt + waitlist capture
 * - billing not configured   → waitlist (Pro not live yet)
 * - signed in, not entitled  → Upgrade (Stripe Checkout)
 * - entitled                 → active state + Manage (Stripe Portal)
 */
export function ProCta() {
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

  if (!billing.isSignedIn) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-xs text-white/50">
          Connect your wallet and{" "}
          <Link href="/" className="text-accent hover:underline">
            sign in
          </Link>{" "}
          to upgrade instantly — or join the waitlist for updates.
        </p>
        <WaitlistForm />
      </div>
    );
  }

  if (billing.isLoading) {
    return <p className="text-sm text-white/50">Checking your plan…</p>;
  }

  if (!billing.configured) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-xs text-white/50">
          Pro isn&apos;t live yet. Join the waitlist for early access and
          founding-member pricing.
        </p>
        <WaitlistForm />
      </div>
    );
  }

  if (billing.entitled) {
    return (
      <div className="flex flex-col gap-2">
        <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Pro is active
          {billing.cancelAtPeriodEnd ? " — cancels at period end" : ""}
        </p>
        {billing.hasSubscription ? (
          <button
            type="button"
            onClick={() => run(billing.openPortal)}
            disabled={busy}
            className="rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium text-white/80 hover:border-white/30 hover:text-white disabled:opacity-60"
          >
            {busy ? "Opening…" : "Manage subscription"}
          </button>
        ) : null}
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => run(billing.startCheckout)}
        disabled={busy}
        className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-60"
      >
        {busy ? "Redirecting…" : "Upgrade to Pro"}
      </button>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
