"use client";

import { useQuery } from "@tanstack/react-query";
import type { GasSpendSummary } from "@/types";

type GasResponse = { configured?: boolean; gas?: GasSpendSummary };

export type GasSpendState = {
  gas: GasSpendSummary | null;
  configured: boolean;
  isLoading: boolean;
};

/**
 * Fetches gas spend over the wallet's most recent transactions. No polling
 * interval and a long staleTime — same rate-limit reasoning as useWalletPnl.
 */
export function useGasSpend(address: string | undefined): GasSpendState {
  const enabled = !!address;
  const { data, isLoading } = useQuery({
    queryKey: ["gas-spend", address],
    enabled,
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<GasResponse> => {
      const res = await fetch(`/api/gas?address=${address}`, { credentials: "same-origin" });
      if (!res.ok) throw new Error("Failed to load gas spend");
      return res.json();
    },
  });

  return {
    gas: data?.gas ?? null,
    configured: data?.configured ?? false,
    isLoading: enabled && isLoading,
  };
}
