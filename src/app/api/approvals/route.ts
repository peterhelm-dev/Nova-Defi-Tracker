import { isAddress } from "viem";
import { NextResponse } from "next/server";
import { getSessionAddress } from "@/lib/server/auth";
import { getWalletApprovals } from "@/lib/server/approvals/read";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Open ERC-20 approvals for a watch-only wallet. Reads Approval logs and the
 * current allowance. Nothing is signed here. Revoking happens on revoke.cash.
 */
export async function GET(request: Request) {
  const sessionAddress = await getSessionAddress();
  const queryAddress = new URL(request.url).searchParams.get("address");
  const address = sessionAddress ?? queryAddress;
  if (!address || !isAddress(address)) {
    return NextResponse.json({ error: "A wallet address is required" }, { status: 400 });
  }

  try {
    const result = await getWalletApprovals(address);
    return NextResponse.json({ address, ...result });
  } catch (error) {
    console.error("Approval read failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ address, approvals: [], partial: true });
  }
}
