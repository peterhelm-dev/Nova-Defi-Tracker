"use client";

import { useQueries } from "@tanstack/react-query";
import type { AutoPortfolio, TokenHolding } from "@/types";

type PortfolioResponse = {
  configured?: boolean;
  entitled?: boolean;
  degraded?: boolean;
  portfolio?: AutoPortfolio;
};

export type AutoPortfolioState = {
  portfolio: AutoPortfolio | null;
  configured: boolean;
  entitled: boolean;
  degraded: boolean;
  isLoading: boolean;
  isError: boolean;
  refetch: () => Promise<unknown>;
};

function mergeTokens(tokens: TokenHolding[]): TokenHolding[] {
  const byKey = new Map<string, TokenHolding>();
  for (const token of tokens) {
    const key = `${token.chain}:${token.address}:${token.symbol}`;
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, { ...token });
      continue;
    }
    prev.balance += token.balance;
    prev.valueUsd += token.valueUsd;
  }
  return [...byKey.values()].sort((a, b) => b.valueUsd - a.valueUsd);
}

export function mergePortfolios(portfolios: AutoPortfolio[]): AutoPortfolio | null {
  if (portfolios.length === 0) return null;
  const tokens = mergeTokens(portfolios.flatMap((portfolio) => portfolio.tokens));
  const positions = portfolios.flatMap((portfolio) => portfolio.positions);
  const walletUsd = tokens.reduce((sum, token) => sum + token.valueUsd, 0);
  const defiUsd = positions.reduce((sum, position) => sum + position.valueUsd, 0);
  const coverage = portfolios.some((portfolio) => portfolio.coverage === "major-tokens")
    ? "major-tokens"
    : "detected";

  return {
    address: portfolios.map((portfolio) => portfolio.address).join(","),
    tokens,
    positions,
    walletUsd,
    defiUsd,
    totalUsd: walletUsd + defiUsd,
    chains: [...new Set(portfolios.flatMap((portfolio) => portfolio.chains))],
    provider: portfolios[0]?.provider ?? "public",
    coverage,
    updatedAt: Date.now(),
  };
}

/**
 * Loads every tracked wallet and merges them. One request per address so the
 * server cache (5 minutes) is shared across visitors watching the same wallet.
 */
export function useAutoPortfolio(addresses: string[]): AutoPortfolioState {
  const unique = [...new Set(addresses.map((address) => address.toLowerCase()))];
  const queries = useQueries({
    queries: unique.map((address) => ({
      queryKey: ["auto-portfolio", address],
      enabled: unique.length > 0,
      staleTime: 60_000,
      refetchInterval: 120_000,
      queryFn: async (): Promise<PortfolioResponse> => {
        const res = await fetch(`/api/portfolio?address=${address}`);
        if (!res.ok) throw new Error("Failed to load portfolio");
        return res.json();
      },
    })),
  });

  const portfolios = queries.flatMap((query) => (query.data?.portfolio ? [query.data.portfolio] : []));
  const merged = mergePortfolios(portfolios);

  return {
    portfolio: merged,
    configured: queries.some((query) => query.data?.configured) || unique.length === 0,
    entitled: true,
    degraded: queries.some((query) => query.data?.degraded) || merged?.coverage === "major-tokens",
    isLoading: unique.length > 0 && queries.some((query) => query.isLoading),
    isError: unique.length > 0 && queries.every((query) => query.isError),
    refetch: () => Promise.all(queries.map((query) => query.refetch())),
  };
}
