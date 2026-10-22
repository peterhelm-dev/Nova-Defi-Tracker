import { NextResponse } from "next/server";
import { isPoolId, loadPoolChart, loadPoolIndex } from "@/lib/server/researchData";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id")?.trim() ?? "";
  if (!isPoolId(id)) return NextResponse.json({ error: "Unknown pool" }, { status: 400 });
  const [pools, history] = await Promise.all([loadPoolIndex(), loadPoolChart(id)]);
  const pool = pools.find((item) => item.id === id) ?? null;
  if (!pool) return NextResponse.json({ error: "Pool lookup unavailable" }, { status: 404 });
  return NextResponse.json(
    { pool, history },
    { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800" } },
  );
}
