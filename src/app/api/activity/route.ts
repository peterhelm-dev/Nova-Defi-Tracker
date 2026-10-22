import { isAddress } from "viem";
import { NextResponse } from "next/server";
import { getSessionAddress } from "@/lib/server/auth";
import { readAlchemyActivity } from "@/lib/server/activity/read";
import { getZerionProvider } from "@/lib/server/portfolio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Recent transfers for a watch-only or connected wallet. Alchemy asset
 * transfers are the free path (cached). Zerion is only a fallback when that
 * key exists and Alchemy does not.
 */
export async function GET(request: Request) {
  const sessionAddress = await getSessionAddress();
  const url = new URL(request.url);
  const queryAddress = url.searchParams.get("address");
  const address = sessionAddress ?? queryAddress;
  if (!address || !isAddress(address)) {
    return NextResponse.json({ error: "A wallet address is required" }, { status: 400 });
  }

  try {
    const activity = await readAlchemyActivity(address);
    if (activity) {
      const limitParam = Number(url.searchParams.get("limit"));
      const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 20;
      return NextResponse.json({ configured: true, source: "alchemy", activity: activity.slice(0, limit) });
    }
  } catch (error) {
    console.error("Alchemy activity failed", error instanceof Error ? error.message : "unknown");
  }

  const provider = getZerionProvider();
  if (!provider) return NextResponse.json({ configured: false, reason: "alchemy" });

  const limitParam = Number(url.searchParams.get("limit"));
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 20;

  try {
    const activity = await provider.getRecentActivity(address, limit);
    return NextResponse.json({ configured: true, activity });
  } catch {
    return NextResponse.json({ error: "Activity provider unavailable" }, { status: 502 });
  }
}
