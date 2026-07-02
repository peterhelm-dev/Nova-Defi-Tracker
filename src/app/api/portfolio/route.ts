import { NextResponse } from "next/server";
import { getSessionAddress } from "@/lib/server/auth";
import { isPro } from "@/lib/server/entitlements";
import { getPortfolioProvider } from "@/lib/server/portfolio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Auto-detected, multi-chain portfolio for the signed-in wallet (Phase 2 Pro
 * feature). Scoped to the session address on purpose — we never let a caller
 * scan an arbitrary address on the paid indexer.
 *
 * Response contract lets the client degrade cleanly:
 * - 401 → not signed in.
 * - 200 { configured: false } → no indexer set up; use the free curated flow.
 * - 200 { configured: true, entitled: false } → signed in but not Pro.
 * - 200 { configured: true, entitled: true, portfolio } → detected holdings.
 */
export async function GET() {
  const address = await getSessionAddress();
  if (!address) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const provider = getPortfolioProvider();
  if (!provider) {
    return NextResponse.json({ configured: false });
  }

  if (!isPro(address)) {
    return NextResponse.json({ configured: true, entitled: false });
  }

  try {
    const portfolio = await provider.getPortfolio(address);
    return NextResponse.json({ configured: true, entitled: true, portfolio });
  } catch {
    return NextResponse.json(
      { error: "Portfolio provider unavailable" },
      { status: 502 },
    );
  }
}
