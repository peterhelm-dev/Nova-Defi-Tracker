import { BASE_TOKENS } from "@/lib/tokens";
import type { PriceResponse } from "@/types";

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

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

  try {
    const [tokenRes, ethRes] = await Promise.all([
      fetch(
        `${COINGECKO_BASE}/simple/token_price/base?contract_addresses=${addresses}&vs_currencies=usd&include_24hr_change=true`,
        { next: { revalidate: revalidateSeconds } },
      ),
      fetch(
        `${COINGECKO_BASE}/simple/price?ids=ethereum&vs_currencies=usd&include_24hr_change=true`,
        { next: { revalidate: revalidateSeconds } },
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
