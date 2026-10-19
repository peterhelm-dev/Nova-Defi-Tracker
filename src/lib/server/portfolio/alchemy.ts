import { unstable_cache } from "next/cache";
import { formatUnits } from "viem";
import type { AutoPortfolio, TokenHolding } from "@/types";
import type { PortfolioProvider } from "./provider";

/**
 * Free-tier indexer. Alchemy's Portfolio API returns native + ERC-20 balances
 * with metadata and USD prices for many chains in one call. The free plan is
 * 30M compute units/month (this endpoint is 360 CU), which is enough for a
 * small public launch if responses are cached. It does not include DeFi
 * protocol positions — those stay on the manual Track flow.
 *
 * A single request accepts at most 5 networks, so the chain list is split
 * into batches. Solana is omitted: the same 0x address is not a Solana
 * account, and a second address system isn't worth it for the free launch.
 */

const ENDPOINT = "https://api.g.alchemy.com/data/v1";
const CACHE_SECONDS = 300;
const MIN_USD = 0.01;
const MAX_PAGES = 2;

export const ALCHEMY_NETWORKS: { network: string; chain: string }[] = [
  { network: "eth-mainnet", chain: "ethereum" },
  { network: "base-mainnet", chain: "base" },
  { network: "arb-mainnet", chain: "arbitrum" },
  { network: "opt-mainnet", chain: "optimism" },
  { network: "polygon-mainnet", chain: "polygon" },
  { network: "bnb-mainnet", chain: "binance-smart-chain" },
  { network: "avax-mainnet", chain: "avalanche" },
];

const CHAIN_BY_NETWORK = new Map(ALCHEMY_NETWORKS.map((entry) => [entry.network, entry.chain]));
CHAIN_BY_NETWORK.set("matic-mainnet", "polygon");

export type AlchemyToken = {
  network?: string;
  tokenAddress?: string | null;
  tokenBalance?: string;
  tokenMetadata?: {
    decimals?: number | null;
    logo?: string | null;
    name?: string | null;
    symbol?: string | null;
  } | null;
  tokenPrices?: { currency?: string; value?: string }[] | null;
  error?: string | null;
};

export type AlchemyTokensResponse = {
  data?: { tokens?: AlchemyToken[]; pageKey?: string };
  error?: { partialErrors?: { network?: string; message?: string }[] };
};

export function networkBatches(size = 5): string[][] {
  const networks = ALCHEMY_NETWORKS.map((entry) => entry.network);
  const batches: string[][] = [];
  for (let i = 0; i < networks.length; i += size) {
    batches.push(networks.slice(i, i + size));
  }
  return batches;
}

function parseBalance(hex: string | undefined, decimals: number): number {
  if (!hex) return 0;
  try {
    const raw = BigInt(hex);
    if (raw <= BigInt(0)) return 0;
    const formatted = Number(formatUnits(raw, decimals));
    return Number.isFinite(formatted) ? formatted : 0;
  } catch {
    return 0;
  }
}

/** Pure map from an Alchemy tokens payload to our portfolio shape. */
export function mapAlchemyTokens(address: string, tokens: AlchemyToken[]): AutoPortfolio {
  const holdings: TokenHolding[] = [];
  const chains = new Set<string>();

  for (const token of tokens) {
    if (token.error) continue;
    const chain = CHAIN_BY_NETWORK.get(token.network ?? "") ?? token.network ?? "unknown";
    const meta = token.tokenMetadata ?? {};
    const decimals = typeof meta.decimals === "number" ? meta.decimals : 18;
    const balance = parseBalance(token.tokenBalance, decimals);
    if (balance <= 0) continue;

    const symbol = meta.symbol?.trim() || (token.tokenAddress ? "?" : nativeSymbol(chain));
    if (symbol.length > 24) continue;

    const usd = token.tokenPrices?.find((price) => price.currency === "usd");
    const priceUsd = usd?.value !== undefined ? Number(usd.value) : null;
    const priced = priceUsd !== null && Number.isFinite(priceUsd);
    const valueUsd = priced ? balance * (priceUsd as number) : 0;
    const isNative = token.tokenAddress == null;

    if (priced && valueUsd < MIN_USD) continue;
    if (!priced && !isNative) continue;

    chains.add(chain);
    holdings.push({
      symbol,
      name: meta.name?.trim() || symbol,
      address: token.tokenAddress ?? "native",
      decimals,
      chain,
      iconUrl: meta.logo ?? null,
      fungibleId: token.tokenAddress ?? null,
      balance,
      priceUsd: priced ? priceUsd : null,
      change24h: null,
      valueUsd,
    });
  }

  holdings.sort((a, b) => b.valueUsd - a.valueUsd);
  const walletUsd = holdings.reduce((sum, holding) => sum + holding.valueUsd, 0);

  return {
    address: address.toLowerCase(),
    tokens: holdings,
    positions: [],
    walletUsd,
    defiUsd: 0,
    totalUsd: walletUsd,
    chains: [...chains],
    provider: "alchemy",
    coverage: "detected",
    updatedAt: Date.now(),
  };
}

function nativeSymbol(chain: string): string {
  switch (chain) {
    case "polygon":
      return "POL";
    case "binance-smart-chain":
      return "BNB";
    case "avalanche":
      return "AVAX";
    default:
      return "ETH";
  }
}

async function fetchBatch(
  apiKey: string,
  address: string,
  networks: string[],
): Promise<AlchemyToken[]> {
  const collected: AlchemyToken[] = [];
  let pageKey: string | undefined;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const res = await fetch(`${ENDPOINT}/${apiKey}/assets/tokens/by-address`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        addresses: [{ address, networks }],
        withMetadata: true,
        withPrices: true,
        includeNativeTokens: true,
        includeErc20Tokens: true,
        ...(pageKey ? { pageKey } : {}),
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Alchemy request failed: ${res.status}`);
    }

    const payload = (await res.json()) as AlchemyTokensResponse;
    const tokens = payload.data?.tokens ?? [];
    collected.push(...tokens);

    const failed = new Set(
      (payload.error?.partialErrors ?? []).map((entry) => entry.network).filter(Boolean),
    );
    const gotAny = tokens.some((token) => token.tokenBalance && token.tokenBalance !== "0x0");
    if (!gotAny && networks.every((network) => failed.has(network))) {
      throw new Error("Alchemy returned no networks");
    }

    pageKey = payload.data?.pageKey;
    if (!pageKey) break;
  }

  return collected;
}

async function loadAlchemyPortfolio(address: string): Promise<AutoPortfolio> {
  const apiKey = process.env.ALCHEMY_API_KEY;
  if (!apiKey) throw new Error("ALCHEMY_API_KEY is not set");

  const batches = await Promise.all(
    networkBatches().map(async (networks) => {
      try {
        return await fetchBatch(apiKey, address, networks);
      } catch (error) {
        // A failed extra-chain batch should not hide Ethereum/Base/L2 tokens.
        if (networks.includes("eth-mainnet")) throw error;
        return [] as AlchemyToken[];
      }
    }),
  );

  return mapAlchemyTokens(address, batches.flat());
}

const cachedAlchemyPortfolio = unstable_cache(loadAlchemyPortfolio, ["alchemy-portfolio-v1"], {
  revalidate: CACHE_SECONDS,
});

export class AlchemyProvider implements PortfolioProvider {
  readonly name = "alchemy";

  async getPortfolio(address: string): Promise<AutoPortfolio> {
    return cachedAlchemyPortfolio(address.toLowerCase());
  }
}
