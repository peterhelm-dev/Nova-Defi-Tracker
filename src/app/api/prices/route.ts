import { NextResponse } from "next/server";
import { BASE_TOKENS } from "@/lib/tokens";
import type { PriceResponse } from "@/types";

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

export async function GET() {
  const addresses = BASE_TOKENS.map((token) => token.address.toLowerCase()).join(",");

  try {
    const [tokenRes, ethRes] = await Promise.all([
      fetch(
        `${COINGECKO_BASE}/simple/token_price/base?contract_addresses=${addresses}&vs_currencies=usd&include_24hr_change=true`,
        { next: { revalidate: 30 } },
      ),
      fetch(
        `${COINGECKO_BASE}/simple/price?ids=ethereum&vs_currencies=usd&include_24hr_change=true`,
        { next: { revalidate: 30 } },
      ),
    ]);

    if (!tokenRes.ok || !ethRes.ok) {
      return NextResponse.json(
        { error: "Price provider unavailable" },
        { status: 502 },
      );
    }

    const [tokenJson, ethJson] = await Promise.all([
      tokenRes.json() as Promise<PriceResponse["tokens"]>,
      ethRes.json() as Promise<{ ethereum?: PriceResponse["eth"] }>,
    ]);

    const payload: PriceResponse = {
      tokens: tokenJson,
      eth: ethJson.ethereum,
    };

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Price provider unavailable" },
      { status: 502 },
    );
  }
}
