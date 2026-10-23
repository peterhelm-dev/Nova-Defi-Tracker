"use client";

import { formatPercent, formatUpdatedAt, formatUsd } from "@/lib/format";
import { useDisplayMoney } from "@/lib/currency";
import { maskValue, usePrivacyMode } from "@/lib/privacy";
import type { TokenHolding } from "@/types";

type NetWorthSummaryProps = {
  walletUsd: number;
  defiUsd: number;
  totalUsd: number;
  holdings: TokenHolding[];
  isLoading: boolean;
  pricesUnavailable: boolean;
  pricesUpdatedAt?: number;
  onRefresh?: () => void;
};

export function NetWorthSummary({
  walletUsd,
  defiUsd,
  totalUsd,
  holdings,
  isLoading,
  pricesUnavailable,
  pricesUpdatedAt,
  onRefresh,
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
  const { privacyMode } = usePrivacyMode();
  const { formatValue } = useDisplayMoney();

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-text-muted">Total net worth</p>
        {onRefresh ? (
          <button
            type="button"
            data-sound="off"
            onClick={onRefresh}
            className="text-xs text-text-muted hover:text-foreground"
          >
            Refresh balances
          </button>
        ) : null}
      </div>
      <div className="mt-2 flex flex-wrap items-baseline gap-3">
        <span
          key={isLoading ? "loading" : formatUsd(totalUsd)}
          className="figure-settle font-display text-4xl font-semibold tracking-tight text-foreground"
          aria-label={isLoading ? undefined : `Total net worth ${formatValue(totalUsd)}`}
        >
          {isLoading ? "—" : maskValue(formatValue(totalUsd), privacyMode)}
        </span>
        {!isLoading && pricedValue > 0 && (
          <span
            className={`rounded-full px-2 py-0.5 text-sm font-medium ${
              weightedChange >= 0
                ? "bg-positive/15 text-positive"
                : "bg-negative/15 text-negative"
            }`}
          >
            {formatPercent(weightedChange)} 24h
          </span>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-sm text-text-secondary">
        <span>
          Wallet:{" "}
          <span className="font-medium text-foreground">
            {maskValue(formatValue(walletUsd), privacyMode)}
          </span>
        </span>
        <span>
          DeFi positions:{" "}
          <span className="font-medium text-foreground">
            {maskValue(formatValue(defiUsd), privacyMode)}
          </span>
        </span>
      </div>
      {pricesUnavailable && (
        <p className="mt-3 text-xs text-warning">
          Live prices are temporarily unavailable — balances are shown without
          USD values.
        </p>
      )}
      {!pricesUnavailable && !!pricesUpdatedAt && (
        <p className="mt-3 text-xs text-text-muted">
          Prices updated {formatUpdatedAt(pricesUpdatedAt)}
        </p>
      )}
    </div>
  );
}
