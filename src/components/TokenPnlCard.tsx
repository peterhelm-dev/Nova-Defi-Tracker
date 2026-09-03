"use client";

import { formatPercent, formatUsd } from "@/lib/format";
import type { TokenHolding, TokenPnl } from "@/types";
import { TokenAvatar } from "./TokenAvatar";

type TokenPnlCardProps = {
  holdings: TokenHolding[];
  tokenPnl: TokenPnl[];
  isLoading: boolean;
};

/**
 * Realized/unrealized profit & loss per holding, as computed by the indexer
 * (see ZerionProvider.getTokenPnl) — not derived locally. Limited to the
 * wallet's highest-value holdings (see useTokenPnl's 15-id cap).
 */
export function TokenPnlCard({ holdings, tokenPnl, isLoading }: TokenPnlCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-surface p-6">
        <p className="text-sm font-medium text-white/50">Profit & loss by holding</p>
        <p className="mt-4 text-sm text-white/40">Loading…</p>
      </div>
    );
  }

  if (tokenPnl.length === 0) return null;

  // A fungible id can span multiple chains — use the highest-value row for
  // display (icon/symbol), since PnL itself is already aggregated per token.
  const holdingByFungibleId = new Map<string, TokenHolding>();
  for (const h of holdings) {
    if (!h.fungibleId) continue;
    const existing = holdingByFungibleId.get(h.fungibleId);
    if (!existing || h.valueUsd > existing.valueUsd) holdingByFungibleId.set(h.fungibleId, h);
  }

  const rows = [...tokenPnl].sort((a, b) => b.totalGainUsd - a.totalGainUsd);

  return (
    <div className="rounded-2xl border border-white/10 bg-surface p-6">
      <p className="text-sm font-medium text-white/50">Profit & loss by holding</p>
      <ul className="mt-4 flex flex-col divide-y divide-white/5">
        {rows.map((row) => {
          const holding = holdingByFungibleId.get(row.fungibleId);
          const tone = row.totalGainUsd >= 0 ? "text-emerald-400" : "text-red-400";
          return (
            <li key={row.fungibleId} className="flex items-center justify-between gap-3 py-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <TokenAvatar
                  iconUrl={holding?.iconUrl ?? null}
                  symbol={holding?.symbol ?? row.fungibleId}
                  chain={holding?.chain ?? "unknown"}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {holding?.symbol ?? row.fungibleId}
                  </p>
                  {row.averageBuyPriceUsd !== null && (
                    <p className="truncate text-xs text-white/40">
                      Avg buy {formatUsd(row.averageBuyPriceUsd, { decimals: 2 })}
                    </p>
                  )}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className={`text-sm font-medium tabular-nums ${tone}`}>
                  {formatUsd(row.totalGainUsd)}
                </p>
                {row.totalGainPct !== null && (
                  <p className={`text-xs tabular-nums ${tone}`}>
                    {formatPercent(row.totalGainPct)}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
