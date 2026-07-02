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
  /** The signed-in user is entitled to Pro auto-detection. */
  entitled: boolean;
  isLoading: boolean;
  isError: boolean;
};

/**
 * Fetches the signed-in wallet's auto-detected multi-chain portfolio (Pro).
 * Enabled only when signed in; otherwise the dashboard uses the free curated
 * Base flow. Degrades quietly when no indexer is configured or the user isn't
 * entitled.
 */
export function useAutoPortfolio(enabled: boolean): AutoPortfolioState {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["auto-portfolio"],
    enabled,
    staleTime: 60_000,
    refetchInterval: enabled ? 120_000 : false,
    queryFn: async (): Promise<PortfolioResponse> => {
      const res = await fetch("/api/portfolio", { credentials: "same-origin" });
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
