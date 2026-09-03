"use client";

import { useMemo } from "react";
import { formatUsd } from "@/lib/format";

export type DiversificationItem = { label: string; valueUsd: number };

type DiversificationCardProps = {
  items: DiversificationItem[];
  totalUsd: number;
};

type Level = { label: string; className: string };

function levelFor(topSharePct: number): Level {
  if (topSharePct >= 50) {
    return { label: "Highly concentrated", className: "border-red-500/30 bg-red-500/5 text-red-400" };
  }
  if (topSharePct >= 25) {
    return {
      label: "Moderately concentrated",
      className: "border-amber-500/30 bg-amber-500/5 text-amber-400",
    };
  }
  return {
    label: "Well diversified",
    className: "border-emerald-500/30 bg-emerald-500/5 text-emerald-400",
  };
}

/**
 * Flags concentration risk: how much of net worth sits in the single largest
 * position (token or DeFi position), across however many distinct assets are
 * held. A simple, honest signal — not a full risk model.
 */
export function DiversificationCard({ items, totalUsd }: DiversificationCardProps) {
  const { top, assetCount, topSharePct } = useMemo(() => {
    const positive = items.filter((i) => i.valueUsd > 0);
    const sorted = [...positive].sort((a, b) => b.valueUsd - a.valueUsd);
    const top = sorted[0] ?? null;
    const pct = top && totalUsd > 0 ? (top.valueUsd / totalUsd) * 100 : 0;
    return { top, assetCount: positive.length, topSharePct: pct };
  }, [items, totalUsd]);

  if (!top || totalUsd <= 0) return null;

  const level = levelFor(topSharePct);

  return (
    <div className="rounded-2xl border border-white/10 bg-surface p-6">
      <p className="mb-4 text-sm font-medium text-white/50">Diversification</p>
      <div className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${level.className}`}>
        {level.label}
      </div>
      <p className="mt-3 text-sm text-white/70">
        <span className="font-medium text-white">{top.label}</span> is{" "}
        <span className="font-medium text-white">{topSharePct.toFixed(1)}%</span> of your net
        worth ({formatUsd(top.valueUsd)}).
      </p>
      <p className="mt-1 text-xs text-white/40">
        Spread across {assetCount} asset{assetCount === 1 ? "" : "s"} and positions.
      </p>
    </div>
  );
}
