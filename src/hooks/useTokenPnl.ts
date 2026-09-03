"use client";

import { useQuery } from "@tanstack/react-query";
import type { TokenPnl } from "@/types";

type TokenPnlResponse = { configured?: boolean; tokenPnl?: TokenPnl[] };

export type TokenPnlState = {
  tokenPnl: TokenPnl[];
  configured: boolean;
  isLoading: boolean;
};

/**
 * Per-token realized/unrealized PnL for a wallet's highest-value holdings.
 * No polling interval and a long staleTime — same rate-limit reasoning as
 * useWalletPnl.
 */
export function useTokenPnl(
  address: string | undefined,
  fungibleIds: string[],
): TokenPnlState {
  const ids = fungibleIds.filter(Boolean);
  const enabled = !!address && ids.length > 0;
  const key = ids.slice().sort().join(",");

  const { data, isLoading } = useQuery({
    queryKey: ["token-pnl", address, key],
    enabled,
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<TokenPnlResponse> => {
      const res = await fetch(
        `/api/pnl?address=${address}&ids=${ids.map(encodeURIComponent).join(",")}`,
        { credentials: "same-origin" },
      );
      if (!res.ok) throw new Error("Failed to load token PnL");
      return res.json();
    },
  });

  return {
    tokenPnl: data?.tokenPnl ?? [],
    configured: data?.configured ?? false,
    isLoading: enabled && isLoading,
  };
}
