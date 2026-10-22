import { NextResponse } from "next/server";
import { getNetworkCosts } from "@/lib/server/networkCosts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Current gas price and native-token price for each tracked chain. No key required. */
export async function GET() {
  try {
    const costs = await getNetworkCosts();
    return NextResponse.json(
      { costs },
      { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" } },
    );
  } catch {
    return NextResponse.json({ costs: [] });
  }
}
