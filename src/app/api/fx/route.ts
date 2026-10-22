import { NextResponse } from "next/server";
import { loadFxRates } from "@/lib/server/researchData";

export const runtime = "nodejs";

export async function GET() {
  const rates = await loadFxRates();
  if (!rates) {
    return NextResponse.json({ error: "Rates unavailable" }, { status: 502 });
  }
  return NextResponse.json(rates, {
    headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800" },
  });
}
