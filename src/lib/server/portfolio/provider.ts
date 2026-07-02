import type { AutoPortfolio } from "@/types";

/**
 * The seam between the app and whatever portfolio indexer detects a wallet's
 * complete, multi-chain holdings (tokens + DeFi positions). This is the Phase 2
 * paid value: automatic detection that free public data can't do. Swap or add
 * providers (Zerion, DeBank, Zapper, Covalent, Alchemy) without touching the
 * route or the client.
 */
export interface PortfolioProvider {
  readonly name: string;
  getPortfolio(address: string): Promise<AutoPortfolio>;
}
