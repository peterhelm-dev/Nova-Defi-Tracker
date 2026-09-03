import { NextResponse } from "next/server";
import { fetchTokenPriceHistory } from "@/lib/server/prices";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_DAYS = new Set([1, 7, 30, 90, 365]);

/**
 * Price history for one token — a line chart, not full OHLC candles (see
 * fetchTokenPriceHistory). `chain` and `address` identify the token;
 * `address=native` for a chain's native asset (ETH, MATIC, etc.).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const chain = url.searchParams.get("chain");
  const address = url.searchParams.get("address");
  const days = Number(url.searchParams.get("days") ?? "30");

  if (!chain || !address) {
    return NextResponse.json({ error: "chain and address are required" }, { status: 400 });
  }
  if (!ALLOWED_DAYS.has(days)) {
    return NextResponse.json({ error: "Unsupported days value" }, { status: 400 });
  }

  const points = await fetchTokenPriceHistory(chain, address, days);
  if (points === null) {
    return NextResponse.json({ available: false });
  }

  return NextResponse.json({ available: true, points });
}
