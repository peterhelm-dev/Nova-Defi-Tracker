import type { PortfolioProvider } from "./provider";
import { ZerionProvider } from "./zerion";

export type { PortfolioProvider } from "./provider";

let provider: PortfolioProvider | null | undefined;

/**
 * Returns the configured portfolio indexer, or null when none is set up (in
 * which case the app stays on the free curated-Base flow). Add more providers
 * here — the first configured one wins.
 */
export function getPortfolioProvider(): PortfolioProvider | null {
  if (provider === undefined) {
    if (process.env.ZERION_API_KEY) {
      provider = new ZerionProvider(process.env.ZERION_API_KEY);
    } else {
      provider = null;
    }
  }
  return provider;
}
