import { NextResponse } from "next/server";
import { fetchPrices } from "@/lib/server/prices";

export async function GET() {
  const payload = await fetchPrices();

  if (!payload) {
    return NextResponse.json(
      { error: "Price provider unavailable" },
      { status: 502 },
    );
  }

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
    },
  });
}
