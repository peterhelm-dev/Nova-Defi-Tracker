"use client";

import { useEffect } from "react";
import { useCloudSync } from "@/lib/cloudSync";
import { usePersistedState } from "@/lib/usePersistedState";
import type { NetWorthSnapshot } from "@/types";

const STORAGE_KEY = "base-wealth-tracker:net-worth-history";
const MAX_SNAPSHOTS = 180;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Union local + remote snapshots by date (local wins on collision). */
function mergeSnapshots(
  local: NetWorthSnapshot[],
  remote: NetWorthSnapshot[],
): NetWorthSnapshot[] {
  const byDate = new Map<string, NetWorthSnapshot>();
  for (const snapshot of [...remote, ...local]) byDate.set(snapshot.date, snapshot);
  return [...byDate.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-MAX_SNAPSHOTS);
}

/**
 * Persists one net-worth snapshot per day. Defaults to localStorage so history
 * builds without a backend; when an `authedAddress` is supplied the series also
 * syncs to the server, so it survives a cache clear and follows the user across
 * devices.
 */
export function useNetWorthHistory(
  walletUsd: number,
  defiUsd: number,
  ready: boolean,
  authedAddress: string | null = null,
): NetWorthSnapshot[] {
  const [history, setHistory] = usePersistedState<NetWorthSnapshot[]>(
    STORAGE_KEY,
    [],
  );

  useCloudSync(
    "/api/snapshots",
    "snapshots",
    history,
    setHistory,
    mergeSnapshots,
    authedAddress,
  );

  useEffect(() => {
    if (!ready) return;

    const date = todayKey();
    const totalUsd = walletUsd + defiUsd;

    setHistory((prev) =>
      [
        ...prev.filter((snapshot) => snapshot.date !== date),
        { date, walletUsd, defiUsd, totalUsd },
      ]
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-MAX_SNAPSHOTS),
    );
  }, [walletUsd, defiUsd, ready, setHistory]);

  return history;
}
