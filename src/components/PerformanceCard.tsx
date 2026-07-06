"use client";

import { toCsv } from "@/lib/csv";
import { formatPercent, formatUsd } from "@/lib/format";
import { computePerformance } from "@/lib/performance";
import type { NetWorthSnapshot } from "@/types";
import { ExportCsvButton } from "./ExportCsvButton";

function signedUsd(value: number): string {
  return `${value >= 0 ? "+" : ""}${formatUsd(value)}`;
}

/**
 * Period-return stat tiles (1d/7d/30d/All) computed from the snapshot series.
 * Polarity is carried by the sign and the colored pill together — never color
 * alone. Renders nothing until there are two snapshots to compare.
 */
export function PerformanceCard({ history }: { history: NetWorthSnapshot[] }) {
  const periods = computePerformance(history);
  if (periods.length === 0) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-surface p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-white/50">Performance</p>
        <ExportCsvButton
          filenamePrefix="performance"
          getCsv={() =>
            toCsv(
              ["period", "delta_usd", "delta_pct"],
              periods.map((p) => [p.label, p.deltaUsd, p.deltaPct]),
            )
          }
        />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {periods.map((period) => (
          <div key={period.label}>
            <p className="text-xs uppercase tracking-wide text-white/40">
              {period.label}
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-white">
              {signedUsd(period.deltaUsd)}
            </p>
            {period.deltaPct !== null ? (
              <span
                className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                  period.deltaPct >= 0
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-red-500/15 text-red-400"
                }`}
              >
                {formatPercent(period.deltaPct)}
              </span>
            ) : (
              <span className="mt-1 inline-block text-xs text-white/30">—</span>
            )}
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-white/30">
        Based on daily snapshots — periods appear as your history grows.
      </p>
    </div>
  );
}
