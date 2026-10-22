import { NextResponse } from "next/server";
import { loadYieldPools } from "@/lib/server/yields";
import { curateTrackedPools } from "@/lib/yields";

export const runtime = "nodejs";

export async function GET() {
  const snapshot = await loadYieldPools();
  if (snapshot.unavailable) {
    return NextResponse.json({ pools: [], unavailable: true });
  }
  return NextResponse.json(
    { pools: curateTrackedPools(snapshot.data), unavailable: false },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
  );
}
