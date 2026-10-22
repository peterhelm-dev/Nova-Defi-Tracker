import { unstable_cache } from "next/cache";
import { BASE_TOKENS } from "@/lib/tokens";
import { coingeckoPlatform, nativeCoinId } from "@/lib/coingeckoPlatforms";
import type { PricePoint, PriceResponse } from "@/types";

/**
 * Spot prices for the curated Base list and ETH.
 *
 * Alchemy's Prices API is the primary source and uses the same ALCHEMY_API_KEY
 * as portfolio detection. If that app has Allowlist Domains turned on, a
 * server fetch with no Origin is rejected ("Unspecified origin not on
 * whitelist") and the whole route used to 502. Calls send this site's origin
 * and, on that 403, try the other Novafolio origin and then no Origin.
 *
 * CoinGecko is the fallback. Its free token endpoint allows one contract
 * address per call (error 10012), and a 429 on the old all-in-one batch threw
 * away every token. Non-Pro keys request one address at a time and keep
 * whatever comes back. The last payload that contained a price is reused when
 * a later refresh is empty.
 */

const PRICE_CACHE_SECONDS = 600;
const CHART_CACHE_SECONDS = 900;
/** Alchemy by-address accepts at most 25 contracts per call. */
export const ALCHEMY_ADDRESS_LIMIT = 25;

const ALCHEMY_PRICES = "https://api.g.alchemy.com/prices/v1";
const NOVAFOLIO_ORIGINS = ["https://www.novafolio.app", "https://novafolio.app"];
const COINGECKO_SINGLE_CONCURRENCY = 2;
const COINGECKO_MAX_CONSECUTIVE_429 = 2;

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

export function chunkItems<T>(items: T[], size: number): T[][] {
  if (items.length === 0) return [];
  const width = Math.max(1, size);
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += width) chunks.push(items.slice(i, i + width));
  return chunks;
}

/** Alchemy returns this when a key's domain allowlist is on and the request has no Origin. */
export function shouldRetryAlchemyWithoutOrigin(status: number, body: string): boolean {
  return status === 403 && /whitelist/i.test(body);
}

export function mergePriceResponses(parts: Array<PriceResponse | null | undefined>): PriceResponse {
  const tokens: PriceResponse["tokens"] = {};
  let eth: PriceResponse["eth"];
  for (const part of parts) {
    if (!part) continue;
    mergeQuotes(tokens, part.tokens);
    if (typeof part.eth?.usd === "number") {
      eth = { usd: part.eth.usd, usd_24h_change: part.eth.usd_24h_change ?? eth?.usd_24h_change };
    } else if (part.eth?.usd_24h_change !== undefined && eth) {
      eth = { ...eth, usd_24h_change: part.eth.usd_24h_change };
    }
  }
  return { tokens, eth };
}

/** A partial fresh payload wins. Otherwise keep the last payload that had any price. */
export function chooseSpotPrices(fresh: PriceResponse | null, lastGood: PriceResponse | null): PriceResponse | null {
  if (fresh && priceResponseHasData(fresh)) return fresh;
  if (lastGood && priceResponseHasData(lastGood)) return lastGood;
  return null;
}

/** Configured site origin, then both public Novafolio origins. */
export function alchemyOriginsToTry(configured?: string): string[] {
  const preferred = configured ?? siteOrigin();
  const seen = new Set<string>();
  const origins: string[] = [];
  for (const origin of [preferred, ...NOVAFOLIO_ORIGINS]) {
    if (!origin || seen.has(origin)) continue;
    seen.add(origin);
    origins.push(origin);
  }
  return origins;
}

export function siteOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || NOVAFOLIO_ORIGINS[0];
  try {
    return new URL(raw).origin;
  } catch {
    return NOVAFOLIO_ORIGINS[0];
  }
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

type AlchemyHttpResult =
  | { ok: true; status: number; json: unknown }
  | { ok: false; status: number; body: string };

async function readAlchemy(url: string, init: RequestInit, headers: Headers): Promise<AlchemyHttpResult> {
  try {
    const res = await fetch(url, { ...init, headers, cache: "no-store" });
    const body = await res.text();
    if (!res.ok) return { ok: false, status: res.status, body };
    try {
      return { ok: true, status: res.status, json: body ? JSON.parse(body) : {} };
    } catch {
      return { ok: false, status: res.status, body };
    }
  } catch {
    return { ok: false, status: 0, body: "" };
  }
}

/**
 * Sends the site Origin so an Alchemy domain allowlist can accept a server
 * call. A whitelist 403 tries the other Novafolio origins, then one request
 * with no Origin. The URL is never logged — it contains the API key.
 */
async function alchemyFetch(url: string, init: RequestInit = {}): Promise<AlchemyHttpResult> {
  const baseHeaders = new Headers(init.headers);
  if (!baseHeaders.has("accept")) baseHeaders.set("accept", "application/json");

  let last: AlchemyHttpResult = { ok: false, status: 0, body: "" };
  let sawWhitelist = false;

  for (const origin of alchemyOriginsToTry()) {
    const headers = new Headers(baseHeaders);
    headers.set("origin", origin);
    last = await readAlchemy(url, init, headers);
    if (last.ok) return last;
    if (!shouldRetryAlchemyWithoutOrigin(last.status, last.body)) break;
    sawWhitelist = true;
  }

  if (sawWhitelist) {
    const headers = new Headers(baseHeaders);
    last = await readAlchemy(url, init, headers);
  }

  if (!last.ok) console.error(`Alchemy prices request failed (${last.status})`);
  return last;
}

async function alchemySpotPrices(apiKey: string): Promise<PriceResponse | null> {
  const chunks = chunkItems(BASE_TOKENS, ALCHEMY_ADDRESS_LIMIT);
  const [symbolRes, ...addressResults] = await Promise.all([
    alchemyFetch(`${ALCHEMY_PRICES}/${apiKey}/tokens/by-symbol?symbols=ETH`),
    ...chunks.map((chunk) =>
      alchemyFetch(`${ALCHEMY_PRICES}/${apiKey}/tokens/by-address`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          addresses: chunk.map((token) => ({
            network: "base-mainnet",
            address: token.address,
          })),
        }),
      }),
    ),
  ]);

  const symbols = symbolRes.ok ? (symbolRes.json as { data?: AlchemySymbolItem[] }).data : [];
  const addresses = addressResults.flatMap((result) =>
    result.ok ? ((result.json as { data?: AlchemyAddressItem[] }).data ?? []) : [],
  );
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
  // Free and Demo plans reject more than one address (error 10012). Skipping
  // that batch avoids burning a rate-limit slot on a call that cannot succeed.
  // A Pro key may batch, then fall through to singles on any non-200.
  if (process.env.COINGECKO_PLAN === "pro" && addresses.length > 1) {
    const batch = await coinGeckoJson<Record<string, Quote>>(
      `/simple/token_price/base?contract_addresses=${addresses.join(",")}&vs_currencies=usd&include_24hr_change=true`,
    );
    if (batch.ok) return batch.json;
  }
  return fetchCoinGeckoAddresses(addresses);
}

async function fetchCoinGeckoAddresses(addresses: string[]): Promise<Record<string, Quote>> {
  const merged: Record<string, Quote> = {};
  const queue = [...addresses];
  const state = { consecutive429: 0, stop: false };

  async function worker() {
    while (!state.stop) {
      const address = queue.shift();
      if (!address) return;
      try {
        const single = await coinGeckoJson<Record<string, Quote>>(
          `/simple/token_price/base?contract_addresses=${address}&vs_currencies=usd&include_24hr_change=true`,
        );
        if (single.ok) {
          state.consecutive429 = 0;
          mergeQuotes(merged, single.json);
          continue;
        }
        if (single.status === 429) {
          state.consecutive429 += 1;
          if (state.consecutive429 >= COINGECKO_MAX_CONSECUTIVE_429) state.stop = true;
        } else {
          state.consecutive429 = 0;
        }
      } catch {
        // One network error should not drop prices already collected.
      }
    }
  }

  const workers = Math.min(COINGECKO_SINGLE_CONCURRENCY, queue.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
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

function coversCuratedList(prices: PriceResponse): boolean {
  if (typeof prices.eth?.usd !== "number") return false;
  return BASE_TOKENS.every(
    (token) => typeof prices.tokens[token.address.toLowerCase()]?.usd === "number",
  );
}

async function loadSpotPrices(): Promise<PriceResponse> {
  const apiKey = process.env.ALCHEMY_API_KEY?.trim();
  let alchemy: PriceResponse | null = null;
  if (apiKey) {
    try {
      alchemy = await alchemySpotPrices(apiKey);
    } catch (error) {
      console.error("Alchemy spot prices failed", error instanceof Error ? error.message : "unknown");
    }
  }

  let coinGecko: PriceResponse | null = null;
  if (!alchemy || !coversCuratedList(alchemy)) {
    try {
      coinGecko = await coinGeckoSpotPrices();
    } catch (error) {
      console.error("CoinGecko spot prices failed", error instanceof Error ? error.message : "unknown");
    }
  }

  const merged = mergePriceResponses([coinGecko, alchemy]);
  if (!priceResponseHasData(merged)) throw new Error("Price provider unavailable");
  return merged;
}

const cachedSpotPrices = unstable_cache(loadSpotPrices, ["spot-prices-v4"], {
  revalidate: PRICE_CACHE_SECONDS,
});

let lastGoodPrices: PriceResponse | null = null;

/**
 * USD prices for ETH and the curated Base tokens. A successful payload is
 * cached for 10 minutes. A later empty refresh reuses the last payload that
 * had a price. Returns null only when nothing usable was ever fetched.
 */
export async function fetchPrices(): Promise<PriceResponse | null> {
  try {
    const fresh = await cachedSpotPrices();
    const chosen = chooseSpotPrices(fresh, lastGoodPrices);
    if (chosen) lastGoodPrices = chosen;
    return chosen;
  } catch {
    return chooseSpotPrices(null, lastGoodPrices);
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

  const res = await alchemyFetch(`${ALCHEMY_PRICES}/${apiKey}/tokens/historical`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) return null;
  const json = res.json as { data?: { prices?: HistoricalPriceItem[] } };
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
