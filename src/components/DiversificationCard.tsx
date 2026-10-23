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
    return { label: "Highly concentrated", className: "border-negative/30 bg-negative/10 text-negative" };
  }
  if (topSharePct >= 25) {
    return {
      label: "Moderately concentrated",
      className: "border-warning/30 bg-warning/10 text-warning",
    };
  }
  return {
    label: "Well diversified",
    className: "border-positive/30 bg-positive/10 text-positive",
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
    <div className="rounded-2xl border border-border-subtle bg-surface p-6">
      <p className="mb-4 text-sm font-medium text-text-muted">Diversification</p>
      <div className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${level.className}`}>
        {level.label}
      </div>
      <p className="mt-3 text-sm text-text-secondary">
        <span className="font-medium text-foreground">{top.label}</span> is{" "}
        <span className="font-medium text-foreground">{topSharePct.toFixed(1)}%</span> of your net
        worth ({formatUsd(top.valueUsd)}).
      </p>
      <p className="mt-1 text-xs text-text-muted">
        Spread across {assetCount} asset{assetCount === 1 ? "" : "s"} and positions.
      </p>
    </div>
  );
}
