import type { Address } from "viem";
import { getPortfolioProvider } from "./portfolio";

/**
 * Server-side net worth for the daily snapshot job. Uses the same portfolio
 * provider as the dashboard (Alchemy, Zerion, or the public-RPC fallback).
 * Returns null when balances exist but none could be priced, so the cron
 * doesn't write a misleading $0.
 */
export async function computeWalletUsd(address: Address): Promise<number | null> {
  try {
    const portfolio = await getPortfolioProvider().getPortfolio(address);
    const priced = portfolio.tokens.some((token) => token.priceUsd !== null);
    if (portfolio.tokens.length > 0 && !priced) return null;
    return portfolio.totalUsd;
  } catch {
    return null;
  }
}
