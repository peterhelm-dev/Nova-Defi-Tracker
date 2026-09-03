"use client";

import { useQuery } from "@tanstack/react-query";
import type { WalletPnl } from "@/types";

type PnlResponse = { configured?: boolean; pnl?: WalletPnl };

export type WalletPnlState = {
  pnl: WalletPnl | null;
  configured: boolean;
  isLoading: boolean;
};

/**
 * Fetches the connected wallet's realized/unrealized PnL. No polling interval
 * and a long staleTime — this indexer's key is on a tight daily rate limit, so
 * this is fetched once per session rather than kept continuously fresh.
 */
export function useWalletPnl(address: string | undefined): WalletPnlState {
  const enabled = !!address;
  const { data, isLoading } = useQuery({
    queryKey: ["wallet-pnl", address],
    enabled,
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<PnlResponse> => {
      const res = await fetch(`/api/pnl?address=${address}`, { credentials: "same-origin" });
      if (!res.ok) throw new Error("Failed to load PnL");
      return res.json();
    },
  });

  return {
    pnl: data?.pnl ?? null,
    configured: data?.configured ?? false,
    isLoading: enabled && isLoading,
  };
}
