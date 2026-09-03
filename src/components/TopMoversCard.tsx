"use client";

import { useMemo } from "react";
import { formatPercent, formatUsd } from "@/lib/format";
import type { TokenHolding } from "@/types";
import { TokenAvatar } from "./TokenAvatar";

type TopMoversCardProps = {
  holdings: TokenHolding[];
};

const MAX_PER_SIDE = 3;

/** Highlights the best/worst 24h performers among priced holdings. */
export function TopMoversCard({ holdings }: TopMoversCardProps) {
  const { gainers, losers } = useMemo(() => {
    const priced = holdings.filter(
      (h) => h.change24h !== null && h.valueUsd > 0,
    );
    const sorted = [...priced].sort((a, b) => (b.change24h ?? 0) - (a.change24h ?? 0));
    return {
      gainers: sorted.filter((h) => (h.change24h ?? 0) > 0).slice(0, MAX_PER_SIDE),
      losers: sorted
        .filter((h) => (h.change24h ?? 0) < 0)
        .slice(-MAX_PER_SIDE)
        .reverse(),
    };
  }, [holdings]);

  if (gainers.length === 0 && losers.length === 0) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-surface p-6">
      <p className="mb-4 text-sm font-medium text-white/50">Top movers (24h)</p>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <MoverList title="Gainers" items={gainers} tone="emerald" />
        <MoverList title="Losers" items={losers} tone="red" />
      </div>
    </div>
  );
}

function MoverList({
  title,
  items,
  tone,
}: {
  title: string;
  items: TokenHolding[];
  tone: "emerald" | "red";
}) {
  if (items.length === 0) {
    return (
      <div>
        <p className="mb-2 text-xs uppercase tracking-wide text-white/40">{title}</p>
        <p className="text-sm text-white/30">None</p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-wide text-white/40">{title}</p>
      <ul className="flex flex-col gap-2">
        {items.map((holding) => (
          <li
            key={`${holding.chain}-${holding.address}`}
            className="flex items-center justify-between gap-2 text-sm"
          >
            <span className="flex items-center gap-2 text-white/80">
              <TokenAvatar
                iconUrl={holding.iconUrl}
                symbol={holding.symbol}
                chain={holding.chain}
                size={20}
              />
              {holding.symbol}
            </span>
            <span className="flex items-center gap-2 tabular-nums">
              <span className={tone === "emerald" ? "text-emerald-400" : "text-red-400"}>
                {formatPercent(holding.change24h)}
              </span>
              <span className="text-white/40">{formatUsd(holding.valueUsd)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
