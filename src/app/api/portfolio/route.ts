import { isAddress } from "viem";
import { NextResponse } from "next/server";
import { getSessionAddress } from "@/lib/server/auth";
import { isEntitledPro } from "@/lib/server/entitlements";
import { getPortfolioProvider } from "@/lib/server/portfolio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Auto-detected, multi-chain portfolio for the connected wallet. This is the
 * app's primary flow — every chain the wallet touches, not just Base — so it
 * works for any connected wallet, signed in or not. A signed-in session
 * address still takes precedence (it's the address other synced data, like
 * snapshots, is scoped to); otherwise the client-supplied `address` query
 * param is used, since there's no per-user data to protect here.
 *
 * Response contract lets the client degrade cleanly:
 * - 400 → no wallet address available.
 * - 200 { configured: false } → no indexer set up.
 * - 200 { configured: true, entitled: false } → indexer set up, not entitled.
 * - 200 { configured: true, entitled: true, portfolio } → detected holdings.
 */
export async function GET(request: Request) {
  const sessionAddress = await getSessionAddress();
  const queryAddress = new URL(request.url).searchParams.get("address");

  const address = sessionAddress ?? queryAddress;
  if (!address || !isAddress(address)) {
    return NextResponse.json({ error: "A wallet address is required" }, { status: 400 });
  }

  const provider = getPortfolioProvider();
  if (!provider) {
    return NextResponse.json({ configured: false });
  }

  if (!(await isEntitledPro(address))) {
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
