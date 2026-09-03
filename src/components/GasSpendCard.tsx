"use client";

import { formatChainName, formatUsd } from "@/lib/format";
import type { GasSpendSummary } from "@/types";
import { ChainIcon } from "./ChainIcon";

type GasSpendCardProps = {
  gas: GasSpendSummary | null;
  isLoading: boolean;
};

/**
 * Gas fees paid, summed over the wallet's most recent transactions (a single
 * page — see ZerionProvider.getGasSpend for why this doesn't paginate through
 * full history).
 */
export function GasSpendCard({ gas, isLoading }: GasSpendCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-surface p-6">
        <p className="text-sm font-medium text-white/50">Gas spent</p>
        <p className="mt-4 text-sm text-white/40">Loading…</p>
      </div>
    );
  }

  if (!gas || gas.txCount === 0) return null;

  const since = gas.oldestMinedAt
    ? new Date(gas.oldestMinedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null;
  const sorted = [...gas.byChain].sort((a, b) => b.valueUsd - a.valueUsd);

  return (
    <div className="rounded-2xl border border-white/10 bg-surface p-6">
      <p className="text-sm font-medium text-white/50">Gas spent</p>
      <p className="mt-1 text-2xl font-semibold text-white">{formatUsd(gas.totalUsd)}</p>
      <p className="text-xs text-white/40">
        Across {gas.txCount} transaction{gas.txCount === 1 ? "" : "s"}
        {since ? ` since ${since}` : ""}
      </p>
      <ul className="mt-4 flex flex-col gap-2">
        {sorted.map((c) => (
          <li key={c.chain} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-white/80">
              <ChainIcon chain={c.chain} size={16} />
              {formatChainName(c.chain)}
            </span>
            <span className="tabular-nums text-white/60">{formatUsd(c.valueUsd)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
