import type { NetWorthSnapshot } from "@/types";

export type PeriodPerformance = {
  /** Display label, e.g. "7d" or "All". */
  label: string;
  /** USD change from the period's baseline snapshot to the latest one. */
  deltaUsd: number;
  /** Percent change, or null when the baseline was $0 (undefined return). */
  deltaPct: number | null;
};

const PERIODS: { label: string; days: number }[] = [
  { label: "1d", days: 1 },
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
];

function shiftDate(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function toPerformance(
  label: string,
  base: NetWorthSnapshot,
  latest: NetWorthSnapshot,
): PeriodPerformance {
  return {
    label,
    deltaUsd: latest.totalUsd - base.totalUsd,
    deltaPct:
      base.totalUsd > 0
        ? ((latest.totalUsd - base.totalUsd) / base.totalUsd) * 100
        : null,
  };
}

/**
 * Period returns computed from the daily snapshot series (assumed sorted by
 * date ascending, one snapshot per day — which is how useNetWorthHistory and
 * the snapshot cron store it). A period is only reported when the history
 * actually reaches back that far; "All" is included whenever there are at
 * least two snapshots.
 */
export function computePerformance(
  history: NetWorthSnapshot[],
): PeriodPerformance[] {
  if (history.length < 2) return [];

  const latest = history[history.length - 1];
  const result: PeriodPerformance[] = [];

  for (const { label, days } of PERIODS) {
    const target = shiftDate(latest.date, days);
    // Latest snapshot at or before the target date = the period's baseline.
    const base = [...history]
      .reverse()
      .find((snapshot) => snapshot.date <= target);
    if (base) result.push(toPerformance(label, base, latest));
  }

  result.push(toPerformance("All", history[0], latest));
  return result;
}
