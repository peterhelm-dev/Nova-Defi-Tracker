import { NextResponse } from "next/server";
import { fetchPrices } from "@/lib/server/prices";
import { rateLimit } from "@/lib/server/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=900";

/**
 * ETH plus the curated Base token list. The payload ignores query params —
 * callers that need one token's history use /api/token-chart. Spot prices
 * come from Alchemy when ALCHEMY_API_KEY is set, otherwise CoinGecko.
 */
export async function GET(request: Request) {
  const limited = await rateLimit(request, "prices");
  if (limited) return limited;

  const payload = await fetchPrices();

  if (!payload) {
    return NextResponse.json({ error: "Price provider unavailable" }, { status: 502 });
  }

  return NextResponse.json(payload, {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}
