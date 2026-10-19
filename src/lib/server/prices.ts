import { unstable_cache } from "next/cache";
import { BASE_TOKENS } from "@/lib/tokens";
import { coingeckoPlatform, nativeCoinId } from "@/lib/coingeckoPlatforms";
import type { PricePoint, PriceResponse } from "@/types";

/**
 * Spot prices for the curated Base list and ETH.
 *
 * CoinGecko's free `simple/token_price` endpoint now rejects more than one
 * contract address per call (error 10012). The old route sent the whole list
 * in one request, so any failure — including that 400 — became a 502 even
 * when the ETH price call succeeded. Vercel's shared IPs also get rate-limited
 * on the keyless host.
 *
 * Alchemy's Prices API uses the same ALCHEMY_API_KEY as portfolio detection
 * (40 compute units, well inside the free 30M/month) and is the primary
 * source. CoinGecko, with an optional Demo key, is the fallback.
 */

const PRICE_CACHE_SECONDS = 600;
const CHART_CACHE_SECONDS = 900;

const ALCHEMY_PRICES = "https://api.g.alchemy.com/prices/v1";

const ALCHEMY_NETWORK_BY_CHAIN: Record<string, string> = {
  ethereum: "eth-mainnet",
  base: "base-mainnet",
  arbitrum: "arb-mainnet",
  optimism: "opt-mainnet",
  polygon: "polygon-mainnet",
  avalanche: "avax-mainnet",
  "binance-smart-chain": "bnb-mainnet",
};

const NATIVE_SYMBOL_BY_CHAIN: Record<string, string> = {
  ethereum: "ETH",
  base: "ETH",
  arbitrum: "ETH",
  optimism: "ETH",
  blast: "ETH",
  linea: "ETH",
  scroll: "ETH",
  "zksync-era": "ETH",
  polygon: "POL",
  avalanche: "AVAX",
  "binance-smart-chain": "BNB",
};

type Quote = { usd?: number; usd_24h_change?: number };

export type AlchemyPrice = { currency?: string; value?: string };

export type AlchemySymbolItem = {
  symbol?: string;
  prices?: AlchemyPrice[];
  error?: string | null;
};

export type AlchemyAddressItem = {
  network?: string;
  address?: string;
  prices?: AlchemyPrice[];
  error?: string | null;
};

export type HistoricalPriceItem = { value?: string; timestamp?: string };

function coinGeckoConfig(): { base: string; headers: Record<string, string> } {
  const apiKey = process.env.COINGECKO_API_KEY?.trim() ?? "";
  const isPro = process.env.COINGECKO_PLAN === "pro";
  const headers: Record<string, string> = {};
  if (apiKey) {
    headers[isPro ? "x-cg-pro-api-key" : "x-cg-demo-api-key"] = apiKey;
  }
  return {
    base: isPro ? "https://pro-api.coingecko.com/api/v3" : "https://api.coingecko.com/api/v3",
    headers,
  };
}

export function usdFromAlchemyPrices(prices: AlchemyPrice[] | undefined): number | null {
  const usd = prices?.find((price) => price.currency?.toLowerCase() === "usd");
  if (usd?.value === undefined) return null;
  const value = Number(usd.value);
  return Number.isFinite(value) ? value : null;
}

export function mapAlchemySpotPrices(
  symbols: AlchemySymbolItem[] | undefined,
  addresses: AlchemyAddressItem[] | undefined,
): PriceResponse {
  const eth = symbols?.find((item) => item.symbol?.toUpperCase() === "ETH");
  const ethUsd = usdFromAlchemyPrices(eth?.prices);
  const tokens: PriceResponse["tokens"] = {};

  for (const item of addresses ?? []) {
    if (!item.address || item.error) continue;
    const usd = usdFromAlchemyPrices(item.prices);
    if (usd === null) continue;
    tokens[item.address.toLowerCase()] = { usd };
  }

  return {
    tokens,
    eth: ethUsd === null ? undefined : { usd: ethUsd },
  };
}

export function priceResponseHasData(prices: PriceResponse): boolean {
  if (typeof prices.eth?.usd === "number") return true;
  return Object.values(prices.tokens).some((quote) => typeof quote.usd === "number");
}

/** CoinGecko free tier: "Number of contract addresses ... exceeds the allowed limit of 1". */
export function isCoinGeckoContractLimit(status: number, body: string): boolean {
  return status === 400 && /contract address/i.test(body);
}

export function mapHistoricalPrices(items: HistoricalPriceItem[] | undefined): PricePoint[] {
  const points: PricePoint[] = [];
  for (const item of items ?? []) {
    const priceUsd = Number(item.value);
    const t = item.timestamp ? Date.parse(item.timestamp) : NaN;
    if (!Number.isFinite(priceUsd) || !Number.isFinite(t)) continue;
    points.push({ t, priceUsd });
  }
  return points;
}

export function chartInterval(days: number): "5m" | "1h" | "1d" {
  if (days <= 1) return "5m";
  if (days <= 30) return "1h";
  return "1d";
}

function mergeQuotes(
  into: Record<string, Quote>,
  extra: Record<string, Quote> | undefined,
) {
  for (const [address, quote] of Object.entries(extra ?? {})) {
    const prev = into[address.toLowerCase()] ?? {};
    into[address.toLowerCase()] = {
      usd: quote.usd ?? prev.usd,
      usd_24h_change: quote.usd_24h_change ?? prev.usd_24h_change,
    };
  }
}

async function alchemySpotPrices(apiKey: string): Promise<PriceResponse | null> {
  const [symbolRes, addressRes] = await Promise.all([
    fetch(`${ALCHEMY_PRICES}/${apiKey}/tokens/by-symbol?symbols=ETH`, { cache: "no-store" }),
    fetch(`${ALCHEMY_PRICES}/${apiKey}/tokens/by-address`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        addresses: BASE_TOKENS.map((token) => ({
          network: "base-mainnet",
          address: token.address,
        })),
      }),
      cache: "no-store",
    }),
  ]);

  if (!symbolRes.ok && !addressRes.ok) return null;

  const symbols = symbolRes.ok
    ? ((await symbolRes.json()) as { data?: AlchemySymbolItem[] }).data
    : [];
  const addresses = addressRes.ok
    ? ((await addressRes.json()) as { data?: AlchemyAddressItem[] }).data
    : [];

  const mapped = mapAlchemySpotPrices(symbols, addresses);
  return priceResponseHasData(mapped) ? mapped : null;
}

async function coinGeckoJson<T>(path: string): Promise<{ ok: true; json: T } | { ok: false; status: number; body: string }> {
  const { base, headers } = coinGeckoConfig();
  const res = await fetch(`${base}${path}`, {
    headers: { accept: "application/json", ...headers },
    cache: "no-store",
  });
  if (!res.ok) {
    return { ok: false, status: res.status, body: await res.text() };
  }
  return { ok: true, json: (await res.json()) as T };
}

async function coinGeckoTokenPrices(addresses: string[]): Promise<Record<string, Quote>> {
  const query = addresses.join(",");
  const batch = await coinGeckoJson<Record<string, Quote>>(
    `/simple/token_price/base?contract_addresses=${query}&vs_currencies=usd&include_24hr_change=true`,
  );
  if (batch.ok) return batch.json;
  if (!isCoinGeckoContractLimit(batch.status, batch.body)) return {};

  const merged: Record<string, Quote> = {};
  const queue = [...addresses];
  const workers = Array.from({ length: Math.min(3, queue.length) }, async () => {
    while (queue.length > 0) {
      const address = queue.shift();
      if (!address) return;
      const single = await coinGeckoJson<Record<string, Quote>>(
        `/simple/token_price/base?contract_addresses=${address}&vs_currencies=usd&include_24hr_change=true`,
      );
      if (single.ok) mergeQuotes(merged, single.json);
    }
  });
  await Promise.all(workers);
  return merged;
}

async function coinGeckoSpotPrices(): Promise<PriceResponse | null> {
  const addresses = BASE_TOKENS.map((token) => token.address.toLowerCase());
  const [ethResult, tokenQuotes] = await Promise.all([
    coinGeckoJson<{ ethereum?: Quote }>(
      "/simple/price?ids=ethereum&vs_currencies=usd&include_24hr_change=true",
    ),
    coinGeckoTokenPrices(addresses),
  ]);

  const tokens: Record<string, Quote> = {};
  mergeQuotes(tokens, tokenQuotes);
  const payload: PriceResponse = {
    tokens,
    eth: ethResult.ok ? ethResult.json.ethereum : undefined,
  };
  return priceResponseHasData(payload) ? payload : null;
}

async function loadSpotPrices(): Promise<PriceResponse> {
  const apiKey = process.env.ALCHEMY_API_KEY?.trim();
  if (apiKey) {
    try {
      const alchemy = await alchemySpotPrices(apiKey);
      if (alchemy) return alchemy;
    } catch {
      // Fall through to CoinGecko.
    }
  }

  const fallback = await coinGeckoSpotPrices();
  if (!fallback) throw new Error("Price provider unavailable");
  return fallback;
}

const cachedSpotPrices = unstable_cache(loadSpotPrices, ["spot-prices-v2"], {
  revalidate: PRICE_CACHE_SECONDS,
});

/**
 * USD prices for ETH and the curated Base tokens. Cached for 10 minutes.
 * Returns null only when both Alchemy and CoinGecko fail.
 */
export async function fetchPrices(): Promise<PriceResponse | null> {
  try {
    return await cachedSpotPrices();
  } catch {
    return null;
  }
}

async function coinGeckoHistory(chain: string, address: string, days: number): Promise<PricePoint[] | null> {
  const isNative = address === "native";
  const path = isNative
    ? (() => {
        const id = nativeCoinId(chain);
        return id ? `/coins/${id}/market_chart?vs_currency=usd&days=${days}` : null;
      })()
    : (() => {
        const platform = coingeckoPlatform(chain);
        return platform
          ? `/coins/${platform}/contract/${address.toLowerCase()}/market_chart?vs_currency=usd&days=${days}`
          : null;
      })();
  if (!path) return null;

  const result = await coinGeckoJson<{ prices?: [number, number][] }>(path);
  if (!result.ok) return null;
  return (result.json.prices ?? []).map(([t, priceUsd]) => ({ t, priceUsd }));
}

async function alchemyHistory(chain: string, address: string, days: number): Promise<PricePoint[] | null> {
  const apiKey = process.env.ALCHEMY_API_KEY?.trim();
  if (!apiKey) return null;

  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  const body: Record<string, string> = {
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    interval: chartInterval(days),
  };

  if (address === "native") {
    const symbol = NATIVE_SYMBOL_BY_CHAIN[chain];
    if (!symbol) return null;
    body.symbol = symbol;
  } else {
    const network = ALCHEMY_NETWORK_BY_CHAIN[chain];
    if (!network) return null;
    body.network = network;
    body.address = address;
  }

  const res = await fetch(`${ALCHEMY_PRICES}/${apiKey}/tokens/historical`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { data?: { prices?: HistoricalPriceItem[] } };
  const points = mapHistoricalPrices(json.data?.prices);
  return points.length > 0 ? points : null;
}

async function loadTokenPriceHistory(chain: string, address: string, days: number): Promise<PricePoint[]> {
  try {
    const coinGecko = await coinGeckoHistory(chain, address, days);
    if (coinGecko && coinGecko.length > 0) return coinGecko;
  } catch {
    // Alchemy historical is the fallback.
  }

  const alchemy = await alchemyHistory(chain, address, days);
  if (!alchemy) throw new Error("Chart unavailable");
  return alchemy;
}

const cachedTokenPriceHistory = unstable_cache(loadTokenPriceHistory, ["token-chart-v2"], {
  revalidate: CHART_CACHE_SECONDS,
});

/** Price history for one token. Cached for 15 minutes. Null when neither provider has it. */
export async function fetchTokenPriceHistory(
  chain: string,
  address: string,
  days: number,
): Promise<PricePoint[] | null> {
  try {
    return await cachedTokenPriceHistory(chain, address.toLowerCase(), days);
  } catch {
    return null;
  }
}
