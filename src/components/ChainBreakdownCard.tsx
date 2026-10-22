"use client";

import { formatChainName, formatUsd } from "@/lib/format";
import { ChainIcon } from "./ChainIcon";

const COLORS = ["#c4784a", "#8fbf98", "#e0a36a", "#7f9aa8", "#d4c4b2", "#a66b4a", "#6e8f84", "#a89888"];

export type ChainTotal = { chain: string; valueUsd: number };

type ChainBreakdownCardProps = {
  totals: ChainTotal[];
};

/** Shows how net worth is distributed across chains. */
export function ChainBreakdownCard({ totals }: ChainBreakdownCardProps) {
  const positive = totals.filter((t) => t.valueUsd > 0).sort((a, b) => b.valueUsd - a.valueUsd);
  const grandTotal = positive.reduce((sum, t) => sum + t.valueUsd, 0);

  if (positive.length === 0 || grandTotal <= 0) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-surface p-6">
      <p className="mb-4 text-sm font-medium text-white/50">By chain</p>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-white/5">
        {positive.map((t, index) => (
          <span
            key={t.chain}
            style={{
              width: `${(t.valueUsd / grandTotal) * 100}%`,
              background: COLORS[index % COLORS.length],
            }}
          />
        ))}
      </div>
      <ul className="mt-4 flex flex-col gap-2">
        {positive.map((t) => {
          const pct = (t.valueUsd / grandTotal) * 100;
          return (
            <li key={t.chain} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-white/80">
                <ChainIcon chain={t.chain} size={16} />
                {formatChainName(t.chain)}
              </span>
              <span className="flex items-center gap-2 tabular-nums text-white/60">
                <span>{pct.toFixed(1)}%</span>
                <span className="font-medium text-white">{formatUsd(t.valueUsd)}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
