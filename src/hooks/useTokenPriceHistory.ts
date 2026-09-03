"use client";

import { useQuery } from "@tanstack/react-query";
import type { PricePoint } from "@/types";

type ChartResponse = { available?: boolean; points?: PricePoint[] };

export type TokenPriceHistoryState = {
  points: PricePoint[];
  available: boolean;
  isLoading: boolean;
};

/** Price history for one token's chart. Enabled only while a chart is open (see TokenPriceChartModal). */
export function useTokenPriceHistory(
  chain: string | null,
  address: string | null,
  days: number,
): TokenPriceHistoryState {
  const enabled = !!chain && !!address;

  const { data, isLoading } = useQuery({
    queryKey: ["token-chart", chain, address, days],
    enabled,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<ChartResponse> => {
      const res = await fetch(
        `/api/token-chart?chain=${chain}&address=${encodeURIComponent(address!)}&days=${days}`,
        { credentials: "same-origin" },
      );
      if (!res.ok) throw new Error("Failed to load price history");
      return res.json();
    },
  });

  return {
    points: data?.points ?? [],
    available: data?.available ?? false,
    isLoading: enabled && isLoading,
  };
}
