import { unstable_cache } from "next/cache";
import { protocolFactFromLlama, type ProtocolFact } from "@/lib/depositChecklist";

async function loadProtocolFact(slug: string): Promise<ProtocolFact> {
  const res = await fetch(`https://api.llama.fi/protocol/${encodeURIComponent(slug)}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`protocol ${res.status}`);
  return protocolFactFromLlama((await res.json()) as Parameters<typeof protocolFactFromLlama>[0]);
}

export const getProtocolFact = unstable_cache(loadProtocolFact, ["protocol-fact-v2"], { revalidate: 3600 });
