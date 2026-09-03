import { BASE_TOKENS } from "@/lib/tokens";
import { coingeckoPlatform, nativeCoinId } from "@/lib/coingeckoPlatforms";
import type { PricePoint, PriceResponse } from "@/types";

// CoinGecko Pro keys use the pro-api.coingecko.com host with the
// x-cg-pro-api-key header; Demo keys (also prefixed "CG-", so the prefix
// alone can't distinguish them) must stay on api.coingecko.com with the
// x-cg-demo-api-key header. Set COINGECKO_PLAN=pro to opt into the Pro host;
// defaults to demo/free behavior. Without any key the free unauthenticated
// endpoint is used, which is heavily rate-limited.
const API_KEY = process.env.COINGECKO_API_KEY ?? "";
const IS_PRO = process.env.COINGECKO_PLAN === "pro";
const COINGECKO_BASE = IS_PRO
  ? "https://pro-api.coingecko.com/api/v3"
  : "https://api.coingecko.com/api/v3";

function cgHeaders(): HeadersInit {
  if (!API_KEY) return {};
  return IS_PRO
    ? { "x-cg-pro-api-key": API_KEY }
    : { "x-cg-demo-api-key": API_KEY };
}

/**
 * Fetches USD prices (and 24h change) for ETH and the curated Base token list
 * from CoinGecko. Shared by the /api/prices route and the server-side snapshot
 * job. Returns null when the provider is unavailable so callers can decide how
 * to degrade.
 */
export async function fetchPrices(
  revalidateSeconds = 30,
): Promise<PriceResponse | null> {
  const addresses = BASE_TOKENS.map((token) => token.address.toLowerCase()).join(",");
  const headers = cgHeaders();

  try {
    const [tokenRes, ethRes] = await Promise.all([
      fetch(
        `${COINGECKO_BASE}/simple/token_price/base?contract_addresses=${addresses}&vs_currencies=usd&include_24hr_change=true`,
        { next: { revalidate: revalidateSeconds }, headers },
      ),
      fetch(
        `${COINGECKO_BASE}/simple/price?ids=ethereum&vs_currencies=usd&include_24hr_change=true`,
        { next: { revalidate: revalidateSeconds }, headers },
      ),
    ]);

    if (!tokenRes.ok || !ethRes.ok) return null;

    const [tokenJson, ethJson] = await Promise.all([
      tokenRes.json() as Promise<PriceResponse["tokens"]>,
      ethRes.json() as Promise<{ ethereum?: PriceResponse["eth"] }>,
    ]);

    return { tokens: tokenJson, eth: ethJson.ethereum };
  } catch {
    return null;
  }
}

/**
 * Price history for one token, for a chart — a line of (timestamp, price),
 * not full OHLC candles. Native assets (address "native") resolve to a
 * per-chain coin id (e.g. Base/Ethereum ETH -> "ethereum"); ERC-20s use
 * CoinGecko's contract-based endpoint directly, no id-resolution needed.
 * Returns null when the chain/token isn't mapped to a known CoinGecko id —
 * callers should show "chart unavailable" rather than nothing.
 */
export async function fetchTokenPriceHistory(
  chain: string,
  address: string,
  days: number,
): Promise<PricePoint[] | null> {
  const headers = cgHeaders();
  const isNative = address === "native";

  const url = isNative
    ? (() => {
        const id = nativeCoinId(chain);
        return id
          ? `${COINGECKO_BASE}/coins/${id}/market_chart?vs_currency=usd&days=${days}`
          : null;
      })()
    : (() => {
        const platform = coingeckoPlatform(chain);
        return platform
          ? `${COINGECKO_BASE}/coins/${platform}/contract/${address.toLowerCase()}/market_chart/?vs_currency=usd&days=${days}`
          : null;
      })();

  if (!url) return null;

  try {
    const res = await fetch(url, { next: { revalidate: 300 }, headers });
    if (!res.ok) return null;
    const json = (await res.json()) as { prices?: [number, number][] };
    return (json.prices ?? []).map(([t, priceUsd]) => ({ t, priceUsd }));
  } catch {
    return null;
  }
}
