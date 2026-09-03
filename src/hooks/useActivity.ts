"use client";

import { useQuery } from "@tanstack/react-query";
import type { ActivityItem } from "@/types";

type ActivityResponse = { configured?: boolean; activity?: ActivityItem[] };

export type ActivityState = {
  activity: ActivityItem[];
  configured: boolean;
  isLoading: boolean;
};

/**
 * Fetches recent onchain activity. No polling interval and a long
 * staleTime — same rate-limit reasoning as useWalletPnl/useGasSpend, and it
 * shares a query key (and therefore the Zerion fetch cache) with the gas
 * summary since both read the same transactions page.
 */
export function useActivity(address: string | undefined, limit = 20): ActivityState {
  const enabled = !!address;
  const { data, isLoading } = useQuery({
    queryKey: ["activity", address, limit],
    enabled,
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<ActivityResponse> => {
      const res = await fetch(`/api/activity?address=${address}&limit=${limit}`, {
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error("Failed to load activity");
      return res.json();
    },
  });

  return {
    activity: data?.activity ?? [],
    configured: data?.configured ?? false,
    isLoading: enabled && isLoading,
  };
}
