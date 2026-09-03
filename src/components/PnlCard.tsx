"use client";

import { formatPercent, formatUsd } from "@/lib/format";
import type { WalletPnl } from "@/types";

type PnlCardProps = {
  pnl: WalletPnl | null;
  isLoading: boolean;
};

function GainStat({
  label,
  usd,
  pct,
}: {
  label: string;
  usd: number;
  pct: number | null;
}) {
  const tone = usd >= 0 ? "text-emerald-400" : "text-red-400";
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-white/40">{label}</p>
      <p className={`mt-1 text-lg font-semibold tabular-nums ${tone}`}>{formatUsd(usd)}</p>
      {pct !== null && (
        <p className={`text-xs tabular-nums ${tone}`}>{formatPercent(pct)}</p>
      )}
    </div>
  );
}

/**
 * Realized/unrealized profit & loss, as computed by the indexer from the
 * wallet's full transaction history — not derived locally.
 */
export function PnlCard({ pnl, isLoading }: PnlCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-surface p-6">
        <p className="text-sm font-medium text-white/50">Profit & loss</p>
        <p className="mt-4 text-sm text-white/40">Loading…</p>
      </div>
    );
  }

  if (!pnl) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-surface p-6">
      <p className="mb-4 text-sm font-medium text-white/50">Profit & loss</p>
      <div className="grid grid-cols-3 gap-4">
        <GainStat label="Total" usd={pnl.totalGainUsd} pct={pnl.totalGainPct} />
        <GainStat label="Realized" usd={pnl.realizedGainUsd} pct={pnl.realizedGainPct} />
        <GainStat label="Unrealized" usd={pnl.unrealizedGainUsd} pct={pnl.unrealizedGainPct} />
      </div>
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t border-white/5 pt-3 text-xs text-white/40">
        <span>
          Total invested <span className="text-white/70">{formatUsd(pnl.totalInvestedUsd)}</span>
        </span>
        <span>
          Net invested <span className="text-white/70">{formatUsd(pnl.netInvestedUsd)}</span>
        </span>
      </div>
    </div>
  );
}
