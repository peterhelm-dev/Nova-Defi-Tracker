"use client";

import { formatPercent, formatUpdatedAt, formatUsd } from "@/lib/format";
import type { TokenHolding } from "@/types";

type NetWorthSummaryProps = {
  walletUsd: number;
  defiUsd: number;
  totalUsd: number;
  holdings: TokenHolding[];
  isLoading: boolean;
  pricesUnavailable: boolean;
  pricesUpdatedAt?: number;
};

export function NetWorthSummary({
  walletUsd,
  defiUsd,
  totalUsd,
  holdings,
  isLoading,
  pricesUnavailable,
  pricesUpdatedAt,
}: NetWorthSummaryProps) {
  const pricedValue = holdings.reduce(
    (sum, h) => sum + (h.priceUsd !== null ? h.valueUsd : 0),
    0,
  );
  const weightedChange = holdings.reduce(
    (sum, h) =>
      sum + (h.change24h !== null ? (h.valueUsd / (pricedValue || 1)) * h.change24h : 0),
    0,
  );

  return (
    <div className="rounded-2xl border border-white/10 bg-surface p-6">
      <p className="text-sm font-medium text-white/50">Total net worth</p>
      <div className="mt-2 flex flex-wrap items-baseline gap-3">
        <span className="text-4xl font-semibold tracking-tight text-white">
          {isLoading ? "—" : formatUsd(totalUsd)}
        </span>
        {!isLoading && pricedValue > 0 && (
          <span
            className={`rounded-full px-2 py-0.5 text-sm font-medium ${
              weightedChange >= 0
                ? "bg-emerald-500/15 text-emerald-400"
                : "bg-red-500/15 text-red-400"
            }`}
          >
            {formatPercent(weightedChange)} 24h
          </span>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-sm text-white/60">
        <span>
          Wallet:{" "}
          <span className="font-medium text-white">{formatUsd(walletUsd)}</span>
        </span>
        <span>
          DeFi positions:{" "}
          <span className="font-medium text-white">{formatUsd(defiUsd)}</span>
        </span>
      </div>
      {pricesUnavailable && (
        <p className="mt-3 text-xs text-amber-400">
          Live prices are temporarily unavailable — balances are shown without
          USD values.
        </p>
      )}
      {!pricesUnavailable && !!pricesUpdatedAt && (
        <p className="mt-3 text-xs text-white/30">
          Prices updated {formatUpdatedAt(pricesUpdatedAt)}
        </p>
      )}
    </div>
  );
}
