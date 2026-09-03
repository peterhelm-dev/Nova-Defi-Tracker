import { isAddress } from "viem";
import { NextResponse } from "next/server";
import { getSessionAddress } from "@/lib/server/auth";
import { getZerionProvider } from "@/lib/server/portfolio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Recent onchain activity for the connected wallet. Zerion-only — degrades
 * to `{ configured: false }` when no indexer is set up, same contract as
 * /api/portfolio.
 */
export async function GET(request: Request) {
  const sessionAddress = await getSessionAddress();
  const url = new URL(request.url);
  const queryAddress = url.searchParams.get("address");
  const address = sessionAddress ?? queryAddress;
  if (!address || !isAddress(address)) {
    return NextResponse.json({ error: "A wallet address is required" }, { status: 400 });
  }

  const provider = getZerionProvider();
  if (!provider) {
    return NextResponse.json({ configured: false });
  }

  const limitParam = Number(url.searchParams.get("limit"));
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 20;

  try {
    const activity = await provider.getRecentActivity(address, limit);
    return NextResponse.json({ configured: true, activity });
  } catch {
    return NextResponse.json({ error: "Activity provider unavailable" }, { status: 502 });
  }
}
