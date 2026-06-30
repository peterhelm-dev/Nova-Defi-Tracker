"use client";

import { useCallback } from "react";
import { useCloudSync } from "@/lib/cloudSync";
import { usePersistedState } from "@/lib/usePersistedState";
import type { TrackedPosition } from "@/types";

const STORAGE_KEY = "base-wealth-tracker:defi-positions";

/** Union local + remote positions by id, newest first. */
function mergePositions(
  local: TrackedPosition[],
  remote: TrackedPosition[],
): TrackedPosition[] {
  const byId = new Map<string, TrackedPosition>();
  for (const position of [...remote, ...local]) byId.set(position.id, position);
  return [...byId.values()].sort((a, b) => b.addedAt - a.addedAt);
}

export function useTrackedPositions(authedAddress: string | null = null) {
  const [positions, setPositions] = usePersistedState<TrackedPosition[]>(
    STORAGE_KEY,
    [],
  );

  useCloudSync(
    "/api/positions",
    "positions",
    positions,
    setPositions,
    mergePositions,
    authedAddress,
  );

  const addPosition = useCallback(
    (input: Omit<TrackedPosition, "id" | "addedAt">) => {
      setPositions((prev) => [
        { ...input, id: crypto.randomUUID(), addedAt: Date.now() },
        ...prev,
      ]);
    },
    [setPositions],
  );

  const removePosition = useCallback(
    (id: string) => {
      setPositions((prev) => prev.filter((position) => position.id !== id));
    },
    [setPositions],
  );

  const totalUsd = positions.reduce(
    (sum, position) => sum + position.amountUsd,
    0,
  );

  return { positions, addPosition, removePosition, totalUsd };
}
