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
 * Recent transfers. Cached on the server for 10 minutes. No polling, so an
 * open tab does not keep asking Alchemy.
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
