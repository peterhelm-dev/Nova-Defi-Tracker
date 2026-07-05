"use client";

import { useState } from "react";
import { useAlerts } from "@/hooks/useAlerts";
import { formatUsd } from "@/lib/format";
import { BASE_TOKENS } from "@/lib/tokens";
import type { AlertDirection } from "@/types";

const TOKEN_OPTIONS = [
  { symbol: "ETH", address: "native" },
  ...BASE_TOKENS.map((t) => ({ symbol: t.symbol, address: t.address as string })),
];

/**
 * Price alerts for signed-in users: create/delete threshold rules and see
 * alerts fired by the hourly server sweep until dismissed. One alert per
 * threshold crossing (rules re-arm when the price crosses back).
 */
export function AlertsCard({ authedAddress }: { authedAddress: string | null }) {
  const { rules, events, isLoading, addRule, removeRule, dismissEvent } =
    useAlerts(authedAddress);
  const [tokenAddress, setTokenAddress] = useState("native");
  const [direction, setDirection] = useState<AlertDirection>("above");
  const [threshold, setThreshold] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!authedAddress) return null;

  async function onAdd(event: React.FormEvent) {
    event.preventDefault();
    const thresholdUsd = Number(threshold);
    if (!Number.isFinite(thresholdUsd) || thresholdUsd <= 0) {
      setError("Enter a positive USD price");
      return;
    }
    const token = TOKEN_OPTIONS.find((t) => t.address === tokenAddress);
    if (!token) return;

    setBusy(true);
    setError(null);
    try {
      await addRule({
        symbol: token.symbol,
        tokenAddress: token.address,
        direction,
        thresholdUsd,
      });
      setThreshold("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the alert");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-surface p-6">
      <p className="text-sm font-medium text-white/50">Price alerts</p>

      {events.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {events.map((e) => (
            <li
              key={e.id}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm"
            >
              <span aria-hidden>🔔</span>
              <span className="text-white/90">
                {e.symbol} went {e.direction} {formatUsd(e.thresholdUsd)} —
                hit {formatUsd(e.priceUsd)}
              </span>
              <button
                type="button"
                onClick={() => dismissEvent(e.id)}
                className="ml-auto text-xs text-white/50 hover:text-white/80"
              >
                Dismiss
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={onAdd} className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-sm text-white/60">Alert me when</span>
        <select
          value={tokenAddress}
          onChange={(e) => setTokenAddress(e.target.value)}
          aria-label="Token"
          className="rounded-lg border border-white/15 bg-surface px-2 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none"
        >
          {TOKEN_OPTIONS.map((t) => (
            <option key={t.address} value={t.address}>
              {t.symbol}
            </option>
          ))}
        </select>
        <select
          value={direction}
          onChange={(e) => setDirection(e.target.value as AlertDirection)}
          aria-label="Direction"
          className="rounded-lg border border-white/15 bg-surface px-2 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none"
        >
          <option value="above">goes above</option>
          <option value="below">goes below</option>
        </select>
        <input
          type="number"
          min="0"
          step="any"
          required
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          placeholder="USD price"
          aria-label="USD price threshold"
          className="w-28 rounded-lg border border-white/15 bg-surface px-2 py-1.5 text-sm text-foreground placeholder:text-white/30 focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-60"
        >
          Add alert
        </button>
        {error ? <span className="text-xs text-red-400">{error}</span> : null}
      </form>

      <div className="mt-4">
        {isLoading ? (
          <p className="text-sm text-white/40">Loading alerts…</p>
        ) : rules.length === 0 ? (
          <p className="text-sm text-white/40">
            No alerts yet — they&apos;re checked hourly on the server, so they
            work even while you&apos;re away.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-white/5">
            {rules.map((rule) => (
              <li
                key={rule.id}
                className="flex items-center justify-between gap-3 py-2.5 text-sm"
              >
                <span className="text-white/80">
                  {rule.symbol} {rule.direction} {formatUsd(rule.thresholdUsd)}
                  {!rule.armed && (
                    <span className="ml-2 text-xs text-white/40">
                      fired — re-arms when price crosses back
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => removeRule(rule.id)}
                  className="text-xs text-white/50 hover:text-red-400"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
