import { NextResponse } from "next/server";
import { fetchBaseDefiPools } from "@/lib/server/defiPools";

export async function GET() {
  const pools = await fetchBaseDefiPools();
  if (!pools) {
    return NextResponse.json(
      { error: "DeFi data provider unavailable" },
      { status: 502 },
    );
  }

  return NextResponse.json(
    { pools },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
