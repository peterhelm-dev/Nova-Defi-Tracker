import { isAddress } from "viem";
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";
import { normalize } from "viem/ens";
import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const client = createPublicClient({
  chain: mainnet,
  transport: http("https://ethereum.publicnode.com", { timeout: 8_000 }),
});

const resolveEns = unstable_cache(
  async (name: string) => {
    const address = await client.getEnsAddress({ name: normalize(name) });
    return address?.toLowerCase() ?? null;
  },
  ["ens-address-v1"],
  { revalidate: 60 * 60 },
);

/**
 * Resolves an ENS name to an address using a public Ethereum RPC. No API key.
 * Plain 0x addresses are echoed back so the client can use one endpoint.
 */
export async function GET(request: Request) {
  const name = new URL(request.url).searchParams.get("name")?.trim() ?? "";
  if (!name || name.length > 80) {
    return NextResponse.json({ error: "Enter a wallet address or ENS name" }, { status: 400 });
  }

  if (isAddress(name)) {
    return NextResponse.json({ address: name.toLowerCase(), name });
  }

  if (!name.includes(".")) {
    return NextResponse.json({ error: "Enter a wallet address or ENS name" }, { status: 400 });
  }

  try {
    const address = await resolveEns(name);
    if (!address) {
      return NextResponse.json({ error: `No address found for ${name}` }, { status: 404 });
    }
    return NextResponse.json({ address, name });
  } catch {
    return NextResponse.json({ error: "Could not resolve that name" }, { status: 502 });
  }
}
