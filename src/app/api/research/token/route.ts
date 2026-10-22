import { NextResponse } from "next/server";
import { isCoinId, loadTokenResearch } from "@/lib/server/researchData";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id")?.trim() ?? "";
  if (!isCoinId(id)) return NextResponse.json({ error: "Unknown token" }, { status: 400 });
  const result = await loadTokenResearch(id);
  if (!result.profile) return NextResponse.json({ error: "Token lookup unavailable" }, { status: 502 });
  return NextResponse.json(result, {
    headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800" },
  });
}
