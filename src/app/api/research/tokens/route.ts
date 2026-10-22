import { NextResponse } from "next/server";
import { searchTokens } from "@/lib/server/researchData";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 40) ?? "";
  if (query.length < 2) return NextResponse.json({ tokens: [] });
  const tokens = await searchTokens(query);
  return NextResponse.json(
    { tokens },
    { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800" } },
  );
}
