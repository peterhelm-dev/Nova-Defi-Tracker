import { NextResponse } from "next/server";
import { searchPools } from "@/lib/research";
import { loadYieldPools } from "@/lib/server/yields";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 40) ?? "";
  if (query.length < 2) return NextResponse.json({ pools: [], unavailable: false });
  const snapshot = await loadYieldPools();
  if (snapshot.unavailable) return NextResponse.json({ pools: [], unavailable: true });
  return NextResponse.json(
    { pools: searchPools(snapshot.data, query), unavailable: false },
    { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800" } },
  );
}
