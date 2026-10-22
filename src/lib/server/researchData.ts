import { unstable_cache } from "next/cache";
import {
  mapMarketChart,
  mapTokenProfile,
  mapTokenSearch,
  type TokenHit,
  type TokenProfile,
} from "@/lib/research";
import type { FxRates } from "@/lib/balanceView";

const API_KEY = process.env.COINGECKO_API_KEY ?? "";
const IS_PRO = process.env.COINGECKO_PLAN === "pro";
const COINGECKO_BASE = IS_PRO
  ? "https://pro-api.coingecko.com/api/v3"
  : "https://api.coingecko.com/api/v3";

function cgHeaders(): HeadersInit {
  if (!API_KEY) return {};
  return IS_PRO ? { "x-cg-pro-api-key": API_KEY } : { "x-cg-demo-api-key": API_KEY };
}

async function cg(path: string): Promise<unknown> {
  const res = await fetch(`${COINGECKO_BASE}${path}`, {
    headers: cgHeaders(),
    next: { revalidate: 900 },
  });
  if (!res.ok) throw new Error(`coingecko ${res.status}`);
  return res.json();
}

export function isCoinId(value: string): boolean {
  return /^[a-z0-9-]{1,80}$/i.test(value);
}

export function isPoolId(value: string): boolean {
  return /^[a-z0-9-]{8,80}$/i.test(value);
}

const searchTokensCached = unstable_cache(
  async (query: string): Promise<TokenHit[]> => mapTokenSearch(await cg(`/search?query=${encodeURIComponent(query)}`)),
  ["research-token-search-v2"],
  { revalidate: 600 },
);

const tokenProfileCached = unstable_cache(
  async (id: string): Promise<{ profile: TokenProfile; points: { t: number; priceUsd: number }[] }> => {
    const detail = await cg(
      `/coins/${encodeURIComponent(id)}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`,
    );
    const profile = mapTokenProfile(detail);
    if (!profile) throw new Error("unmapped token");
    let points: { t: number; priceUsd: number }[] = [];
    try {
      points = mapMarketChart(await cg(`/coins/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=30`));
    } catch {
      points = [];
    }
    return { profile, points };
  },
  ["research-token-v1"],
  { revalidate: 900 },
);

const fxCached = unstable_cache(
  async (): Promise<FxRates> => {
    const payload = await cg("/simple/price?ids=ethereum,bitcoin&vs_currencies=usd,eur,gbp,jpy");
    const row = payload as { ethereum?: Record<string, number>; bitcoin?: Record<string, number> } | null;
    const eth = row?.ethereum;
    const btc = row?.bitcoin;
    if (!eth?.usd || !btc?.usd || !eth.eur || !eth.gbp || !eth.jpy) {
      throw new Error("fx payload incomplete");
    }
    return {
      eurPerUsd: eth.eur / eth.usd,
      gbpPerUsd: eth.gbp / eth.usd,
      jpyPerUsd: eth.jpy / eth.usd,
      ethUsd: eth.usd,
      btcUsd: btc.usd,
    };
  },
  ["fx-rates-v2"],
  { revalidate: 600 },
);

export async function searchTokens(query: string): Promise<TokenHit[]> {
  try {
    return await searchTokensCached(query);
  } catch {
    return [];
  }
}

export async function loadTokenResearch(
  id: string,
): Promise<{ profile: TokenProfile | null; points: { t: number; priceUsd: number }[] }> {
  try {
    return await tokenProfileCached(id);
  } catch {
    return { profile: null, points: [] };
  }
}

export async function loadFxRates(): Promise<FxRates | null> {
  try {
    return await fxCached();
  } catch (error) {
    console.error("fx rates unavailable", error);
    return null;
  }
}
