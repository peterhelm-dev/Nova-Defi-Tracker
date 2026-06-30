"use client";

import { useQuery } from "@tanstack/react-query";
import type { DefiPool } from "@/types";

export function useDefiPools() {
  return useQuery<{ pools: DefiPool[] }>({
    queryKey: ["defi-pools"],
    queryFn: async () => {
      const res = await fetch("/api/defi-pools");
      if (!res.ok) throw new Error("Failed to load DeFi pools");
      return res.json();
    },
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
  });
}
