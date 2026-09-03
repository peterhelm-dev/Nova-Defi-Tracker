"use client";

import { useQuery } from "@tanstack/react-query";
import type { AutoPortfolio } from "@/types";

type PortfolioResponse = {
  configured?: boolean;
  entitled?: boolean;
  portfolio?: AutoPortfolio;
};

export type AutoPortfolioState = {
  portfolio: AutoPortfolio | null;
  /** An indexer is set up server-side. */
  configured: boolean;
  /** The connected wallet is entitled to auto-detection. */
  entitled: boolean;
  isLoading: boolean;
  isError: boolean;
};

/**
 * Fetches the connected wallet's auto-detected, multi-chain portfolio. This
 * is the app's primary flow — enabled as soon as a wallet is connected, no
 * sign-in required. Degrades quietly when no indexer is configured or the
 * wallet isn't entitled.
 */
export function useAutoPortfolio(address: string | undefined): AutoPortfolioState {
  const enabled = !!address;
  const { data, isLoading, isError } = useQuery({
    queryKey: ["auto-portfolio", address],
    enabled,
    staleTime: 60_000,
    refetchInterval: enabled ? 120_000 : false,
    queryFn: async (): Promise<PortfolioResponse> => {
      const res = await fetch(`/api/portfolio?address=${address}`, {
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error("Failed to load portfolio");
      return res.json();
    },
  });

  return {
    portfolio: data?.portfolio ?? null,
    configured: data?.configured ?? false,
    entitled: data?.entitled ?? false,
    isLoading: enabled && isLoading,
    isError,
  };
}
