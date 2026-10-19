import { AlchemyProvider } from "./alchemy";
import { PublicRpcProvider } from "./publicRpc";
import type { PortfolioProvider } from "./provider";
import { ZerionProvider } from "./zerion";

export type { PortfolioProvider } from "./provider";

let provider: PortfolioProvider | undefined;
let zerion: ZerionProvider | null | undefined;
let publicProvider: PublicRpcProvider | undefined;

/**
 * Indexer used for automatic token detection.
 *
 * Alchemy's free portfolio API is the launch default: one call covers the
 * major EVM chains, includes prices, and the free tier is large enough for a
 * Hobby deploy when responses are cached. Zerion stays available when its key
 * is the only one set (richer DeFi positions, much smaller free quota).
 * With no key, the public-RPC fallback still returns major tokens.
 */
export function getPortfolioProvider(): PortfolioProvider {
  if (!provider) {
    if (process.env.ALCHEMY_API_KEY) {
      provider = new AlchemyProvider();
    } else if (process.env.ZERION_API_KEY) {
      provider = new ZerionProvider(process.env.ZERION_API_KEY);
    } else {
      provider = new PublicRpcProvider();
    }
  }
  return provider;
}

export function getPublicPortfolioProvider(): PublicRpcProvider {
  if (!publicProvider) publicProvider = new PublicRpcProvider();
  return publicProvider;
}

/**
 * PnL, gas, and activity stay on Zerion. Null when that key isn't set, even
 * if Alchemy is the portfolio provider.
 */
export function getZerionProvider(): ZerionProvider | null {
  if (zerion === undefined) {
    zerion = process.env.ZERION_API_KEY ? new ZerionProvider(process.env.ZERION_API_KEY) : null;
  }
  return zerion;
}
