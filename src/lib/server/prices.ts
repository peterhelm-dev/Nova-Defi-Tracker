import { BASE_TOKENS } from "@/lib/tokens";
import type { PriceResponse } from "@/types";

// CoinGecko Pro key enables the higher-rate-limit endpoint; demo key uses the
// same public base URL but with the x-cg-demo-api-key header. Without any key
// the free unauthenticated endpoint is used, which is heavily rate-limited.
const API_KEY = process.env.COINGECKO_API_KEY ?? "";
const IS_PRO = API_KEY.startsWith("CG-");
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
