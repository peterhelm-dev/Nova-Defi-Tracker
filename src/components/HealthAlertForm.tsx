"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DEFAULT_HEALTH_THRESHOLD } from "@/lib/healthAlerts/validate";
import { shortenAddress } from "@/lib/format";

type StatusResponse = { available?: boolean };

/**
 * Email opt-in for a health-factor threshold. No account.
 * When Resend or the alert store is unset, the form stays a short status line.
 */
export function HealthAlertForm({ wallets }: { wallets: string[] }) {
  const status = useQuery({
    queryKey: ["health-alert-status"],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<StatusResponse> => {
      const res = await fetch("/api/health-alerts");
      if (!res.ok) throw new Error("status");
      return res.json();
    },
  });
  const [email, setEmail] = useState("");
  const [threshold, setThreshold] = useState(String(DEFAULT_HEALTH_THRESHOLD));
  const [wallet, setWallet] = useState(wallets[0] ?? "");
  const [phase, setPhase] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  if (wallets.length === 0) return null;

  if (status.isLoading) {
    return <p className="text-xs text-text-muted">Checking whether email alerts are on…</p>;
  }
  if (status.isError) {
    return <p className="text-sm text-text-secondary">Email alerts didn&apos;t load. Try again in a minute.</p>;
  }
  if (!status.data?.available) {
    return <p className="text-sm text-text-secondary">Email alerts are coming soon.</p>;
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPhase("submitting");
    setMessage("");
    try {
      const res = await fetch("/api/health-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, address: wallet, threshold }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; alreadyConfirmed?: boolean };
      if (!res.ok) throw new Error(data.error ?? "That didn't send. Try again in a few minutes.");
      setPhase("done");
      setMessage(
        data.alreadyConfirmed
          ? "This address is already confirmed. The threshold is saved."
          : "Check that inbox for a confirmation link. Alerts start after you open it. Every email includes an unsubscribe link.",
      );
    } catch (error) {
      setPhase("error");
      setMessage(error instanceof Error ? error.message : "That didn't send. Try again in a few minutes.");
    }
  }

  if (phase === "done") {
    return <p className="text-sm text-text-secondary">{message}</p>;
  }

  return (
    <form onSubmit={onSubmit} className="mt-1 flex flex-col gap-3">
      <p className="text-sm text-text-secondary">
        Email me if an Aave or Compound health factor for this wallet drops below the number you set. The check runs once a day. This is information, not a recommendation.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        {wallets.length > 1 ? (
          <label className="flex min-w-40 flex-col gap-1 text-xs text-text-muted">
            Wallet
            <select
              value={wallet}
              onChange={(event) => setWallet(event.target.value)}
              aria-label="Wallet for the health alert"
              className="rounded-lg border border-border-subtle bg-background px-2.5 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
            >
              {wallets.map((address) => (
                <option key={address} value={address}>
                  {shortenAddress(address)}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="text-xs text-text-muted">Wallet {shortenAddress(wallets[0] ?? "")}</p>
        )}
        <label className="flex w-28 flex-col gap-1 text-xs text-text-muted">
          Threshold
          <input
            type="number"
            required
            min={1.01}
            max={10}
            step={0.01}
            value={threshold}
            onChange={(event) => setThreshold(event.target.value)}
            aria-label="Health factor threshold"
            className="rounded-lg border border-border-subtle bg-background px-2.5 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
          />
        </label>
        <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs text-text-muted">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@email.com"
            aria-label="Email address"
            autoComplete="email"
            className="rounded-lg border border-border-subtle bg-background px-2.5 py-2 text-sm text-foreground placeholder:text-text-muted focus:border-accent focus:outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={phase === "submitting"}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-text-inverse hover:bg-accent/90 disabled:opacity-60"
        >
          {phase === "submitting" ? "Sending…" : "Email me"}
        </button>
      </div>
      <p className="text-xs text-text-muted">
        No account needed. We store this wallet, the threshold, and the email until you unsubscribe.
      </p>
      {phase === "error" ? <p className="text-sm text-negative">{message}</p> : null}
    </form>
  );
}
