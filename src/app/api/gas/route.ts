import { isAddress } from "viem";
import { NextResponse } from "next/server";
import { getSessionAddress } from "@/lib/server/auth";
import { getZerionProvider } from "@/lib/server/portfolio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Gas spend summed over the wallet's most recent transactions. Zerion-only
 * (see ZerionProvider.getGasSpend) — degrades to `{ configured: false }` when
 * no indexer is set up, same contract as /api/portfolio.
 */
export async function GET(request: Request) {
  const sessionAddress = await getSessionAddress();
  const queryAddress = new URL(request.url).searchParams.get("address");
  const address = sessionAddress ?? queryAddress;
  if (!address || !isAddress(address)) {
    return NextResponse.json({ error: "A wallet address is required" }, { status: 400 });
  }

  const provider = getZerionProvider();
  if (!provider) {
    return NextResponse.json({ configured: false });
  }

  try {
    const gas = await provider.getGasSpend(address);
    return NextResponse.json({ configured: true, gas });
  } catch {
    return NextResponse.json({ error: "Gas summary provider unavailable" }, { status: 502 });
  }
}
