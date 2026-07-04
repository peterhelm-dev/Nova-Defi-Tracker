import { describe, expect, it } from "vitest";
import { computePerformance } from "./performance";
import type { NetWorthSnapshot } from "@/types";

function snap(date: string, totalUsd: number): NetWorthSnapshot {
  return { date, walletUsd: totalUsd, defiUsd: 0, totalUsd };
}

describe("computePerformance", () => {
  it("returns nothing for fewer than two snapshots", () => {
    expect(computePerformance([])).toEqual([]);
    expect(computePerformance([snap("2026-07-01", 100)])).toEqual([]);
  });

  it("computes 1d and All from two consecutive days", () => {
    const result = computePerformance([
      snap("2026-07-01", 1000),
      snap("2026-07-02", 1100),
    ]);
    expect(result.map((p) => p.label)).toEqual(["1d", "All"]);
    expect(result[0]).toMatchObject({ deltaUsd: 100, deltaPct: 10 });
  });

  it("omits periods the history doesn't reach back to", () => {
    const result = computePerformance([
      snap("2026-06-30", 1000),
      snap("2026-07-01", 1050),
      snap("2026-07-02", 1100),
    ]);
    // Only 3 days of history: 7d and 30d unavailable.
    expect(result.map((p) => p.label)).toEqual(["1d", "All"]);
  });

  it("uses the closest snapshot at or before the period boundary", () => {
    const result = computePerformance([
      snap("2026-06-20", 800), // closest ≤ 7d boundary (2026-06-25)
      snap("2026-06-24", 900),
      snap("2026-07-01", 1000),
      snap("2026-07-02", 1100),
    ]);
    const week = result.find((p) => p.label === "7d");
    expect(week).toMatchObject({ deltaUsd: 200 });
    expect(week?.deltaPct).toBeCloseTo((200 / 900) * 100);
  });

  it("reports a null percent when the baseline is zero", () => {
    const result = computePerformance([
      snap("2026-07-01", 0),
      snap("2026-07-02", 500),
    ]);
    expect(result[0]).toMatchObject({ deltaUsd: 500, deltaPct: null });
  });

  it("handles losses with negative deltas", () => {
    const result = computePerformance([
      snap("2026-07-01", 1000),
      snap("2026-07-02", 900),
    ]);
    expect(result[0]).toMatchObject({ deltaUsd: -100, deltaPct: -10 });
  });
});
