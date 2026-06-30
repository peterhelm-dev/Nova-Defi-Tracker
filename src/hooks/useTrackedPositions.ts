"use client";

import { useCallback } from "react";
import { usePersistedState } from "@/lib/usePersistedState";
import type { TrackedPosition } from "@/types";

const STORAGE_KEY = "base-wealth-tracker:defi-positions";

export function useTrackedPositions() {
  const [positions, setPositions] = usePersistedState<TrackedPosition[]>(
    STORAGE_KEY,
    [],
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
