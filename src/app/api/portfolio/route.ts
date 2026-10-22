import { isAddress } from "viem";
import { NextResponse } from "next/server";
import { getSessionAddress } from "@/lib/server/auth";
import { attachDetectedPositions } from "@/lib/server/defi/read";
import { getPortfolioProvider, getPublicPortfolioProvider } from "@/lib/server/portfolio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Token balances for one wallet across the major chains. Free for every
 * visitor — this is not a Pro feature. A signed-in session address wins when
 * present; otherwise the `address` query param is used (watch-only wallets).
 *
 * Alchemy (or Zerion, if that's the only key) is cached for five minutes.
 * If that call fails, or no indexer key is set, the response falls back to
 * public RPC reads of major tokens (`coverage: "major-tokens"`).
 */
export async function GET(request: Request) {
  const sessionAddress = await getSessionAddress();
  const queryAddress = new URL(request.url).searchParams.get("address");
  const address = sessionAddress ?? queryAddress;

  if (!address || !isAddress(address)) {
    return NextResponse.json({ error: "A wallet address is required" }, { status: 400 });
  }

  const primary = getPortfolioProvider();

  try {
    const portfolio = await attachDetectedPositions(await primary.getPortfolio(address));
    return NextResponse.json({
      configured: true,
      entitled: true,
      degraded: false,
      portfolio,
    });
  } catch {
    if (primary.name === "public") {
      return NextResponse.json({ error: "Portfolio data is temporarily unavailable" }, { status: 502 });
    }

    try {
      const portfolio = await attachDetectedPositions(await getPublicPortfolioProvider().getPortfolio(address));
      return NextResponse.json({
        configured: true,
        entitled: true,
        degraded: true,
        portfolio,
      });
    } catch {
      return NextResponse.json({ error: "Portfolio data is temporarily unavailable" }, { status: 502 });
    }
  }
}
