import { isAddress } from "viem";
import { NextResponse } from "next/server";
import { getSessionAddress } from "@/lib/server/auth";
import { readAlchemyGasSpend } from "@/lib/server/gas/read";
import { getZerionProvider } from "@/lib/server/portfolio";
import { rateLimit } from "@/lib/server/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Gas paid by this wallet. Prefers Alchemy asset transfers plus receipts
 * (cached, capped per chain, includes reverted receipts). Falls back to Zerion
 * when that key exists and Alchemy does not.
 */
export async function GET(request: Request) {
  const limited = await rateLimit(request, "gas");
  if (limited) return limited;

  const sessionAddress = await getSessionAddress();
  const queryAddress = new URL(request.url).searchParams.get("address");
  const address = sessionAddress ?? queryAddress;
  if (!address || !isAddress(address)) {
    return NextResponse.json({ error: "A wallet address is required" }, { status: 400 });
  }

  try {
    const gas = await readAlchemyGasSpend(address);
    if (gas) return NextResponse.json({ configured: true, source: "alchemy", gas });
  } catch (error) {
    console.error("Alchemy gas read failed", error instanceof Error ? error.message : "unknown");
  }

  const provider = getZerionProvider();
  if (!provider) return NextResponse.json({ configured: false });

  try {
    const gas = await provider.getGasSpend(address);
    return NextResponse.json({ configured: true, source: "zerion", gas });
  } catch {
    return NextResponse.json({ error: "Gas summary provider unavailable" }, { status: 502 });
  }
}
