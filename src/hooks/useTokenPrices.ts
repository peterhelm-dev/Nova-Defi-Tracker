"use client";

import { useQuery } from "@tanstack/react-query";
import type { PriceResponse } from "@/types";

export function useTokenPrices() {
  return useQuery<PriceResponse>({
    queryKey: ["token-prices"],
    queryFn: async () => {
      const res = await fetch("/api/prices");
      if (!res.ok) throw new Error("Failed to load token prices");
      return res.json();
    },
    staleTime: 25_000,
    refetchInterval: 60_000,
  });
}
