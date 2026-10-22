"use client";

import { useQuery } from "@tanstack/react-query";
import type { DefiPool } from "@/types";

export function useDefiPools() {
  return useQuery<{ pools: DefiPool[]; unavailable: boolean }>({
    queryKey: ["defi-pools"],
    queryFn: async () => {
      const res = await fetch("/api/defi-pools");
      if (!res.ok) return { pools: [], unavailable: true };
      const data = (await res.json()) as { pools?: DefiPool[]; unavailable?: boolean };
      return { pools: data.pools ?? [], unavailable: data.unavailable === true };
    },
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
  });
}
