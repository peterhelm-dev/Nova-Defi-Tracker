import { isAddress } from "viem";
import { NextResponse } from "next/server";
import { getSessionAddress } from "@/lib/server/auth";
import { getZerionProvider } from "@/lib/server/portfolio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Realized/unrealized PnL for the connected wallet. Zerion-only (see
 * ZerionProvider.getPnl) — degrades to `{ configured: false }` when no
 * indexer is set up, same contract as /api/portfolio.
 *
 * With an `ids` query param (comma-separated fungible ids), returns a
 * per-token breakdown instead (see ZerionProvider.getTokenPnl).
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

  const idsParam = url.searchParams.get("ids");

  try {
    if (idsParam) {
      const ids = idsParam.split(",").filter(Boolean);
      const tokenPnl = await provider.getTokenPnl(address, ids);
      return NextResponse.json({ configured: true, tokenPnl });
    }

    const pnl = await provider.getPnl(address);
    return NextResponse.json({ configured: true, pnl });
  } catch {
    return NextResponse.json({ error: "PnL provider unavailable" }, { status: 502 });
  }
}
