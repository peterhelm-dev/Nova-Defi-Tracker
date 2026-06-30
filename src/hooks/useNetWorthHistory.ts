"use client";

import { useEffect } from "react";
import { usePersistedState } from "@/lib/usePersistedState";
import type { NetWorthSnapshot } from "@/types";

const STORAGE_KEY = "base-wealth-tracker:net-worth-history";
const MAX_SNAPSHOTS = 180;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Persists one net-worth snapshot per day to localStorage so the dashboard
 * can chart history without a backend. There's no historical indexer here,
 * so the series only grows from the day this app is first opened onward.
 */
export function useNetWorthHistory(
  walletUsd: number,
  defiUsd: number,
  ready: boolean,
): NetWorthSnapshot[] {
  const [history, setHistory] = usePersistedState<NetWorthSnapshot[]>(
    STORAGE_KEY,
    [],
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
