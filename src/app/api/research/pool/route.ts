import { NextResponse } from "next/server";
import { isPoolId } from "@/lib/server/researchData";
import { loadYieldChart, loadYieldPools } from "@/lib/server/yields";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id")?.trim() ?? "";
  if (!isPoolId(id)) return NextResponse.json({ error: "Unknown pool" }, { status: 400 });
  const snapshot = await loadYieldPools();
  if (snapshot.unavailable) {
    return NextResponse.json({ pool: null, history: [], unavailable: true });
  }
  const pool = snapshot.data.find((item) => item.id === id) ?? null;
  if (!pool) return NextResponse.json({ pool: null, history: [], unavailable: false });
  const history = await loadYieldChart(id);
  return NextResponse.json(
    {
      pool,
      history: history.unavailable ? [] : history.data,
      unavailable: false,
    },
    { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800" } },
  );
}
