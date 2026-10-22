import { unstable_cache } from "next/cache";
import { activityFromTransfers, type TransferRow } from "@/lib/activityFeed";
import { siteOrigin } from "@/lib/server/prices";
import { ALCHEMY_NETWORKS } from "@/lib/server/portfolio/alchemy";
import type { ActivityItem } from "@/types";

const MAX_PER_DIRECTION = 8;

type AlchemyTransfer = {
  hash?: string;
  from?: string;
  to?: string | null;
  value?: number | null;
  asset?: string | null;
  category?: string;
  metadata?: { blockTimestamp?: string };
};

function alchemyKey(): string | null {
  const key = process.env.ALCHEMY_API_KEY?.trim();
  return key ? key : null;
}

async function transfers(network: string, address: string, direction: "from" | "to"): Promise<TransferRow[]> {
  const key = alchemyKey();
  if (!key) return [];
  const body = {
    fromAddress: direction === "from" ? address : undefined,
    toAddress: direction === "to" ? address : undefined,
    category: ["external", "erc20", "erc721", "erc1155"],
    withMetadata: true,
    excludeZeroValue: true,
    maxCount: `0x${MAX_PER_DIRECTION.toString(16)}`,
    order: "desc",
  };
  const res = await fetch(`https://${network}.g.alchemy.com/v2/${key}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: siteOrigin() },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "alchemy_getAssetTransfers",
      params: [body],
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`transfers ${res.status}`);
  const json = (await res.json()) as { result?: { transfers?: AlchemyTransfer[] }; error?: { message?: string } };
  if (json.error) throw new Error(json.error.message ?? "transfers");
  return (json.result?.transfers ?? []).flatMap((row) => {
    if (!row.hash) return [];
    return [
      {
        hash: row.hash,
        from: row.from ?? "",
        to: row.to ?? null,
        asset: row.asset ?? null,
        value: typeof row.value === "number" ? row.value : null,
        category: row.category ?? "external",
        minedAt: row.metadata?.blockTimestamp ?? null,
      },
    ];
  });
}

async function loadActivity(address: string): Promise<ActivityItem[]> {
  const settled = await Promise.all(
    ALCHEMY_NETWORKS.map(async (entry) => {
      try {
        const [outgoing, incoming] = await Promise.all([
          transfers(entry.network, address, "from"),
          transfers(entry.network, address, "to"),
        ]);
        return activityFromTransfers(address, entry.chain, [...outgoing, ...incoming]);
      } catch (error) {
        console.error(`Activity failed on ${entry.chain}`, error instanceof Error ? error.message : "unknown");
        return [] as ActivityItem[];
      }
    }),
  );
  return settled
    .flat()
    .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1))
    .slice(0, 40);
}

/** Recent transfers from Alchemy. Null when the free key is not set. Cached for 10 minutes. */
export async function readAlchemyActivity(address: string): Promise<ActivityItem[] | null> {
  if (!alchemyKey()) return null;
  const normalized = address.toLowerCase();
  return unstable_cache(() => loadActivity(normalized), ["activity-alchemy-v1", normalized], { revalidate: 600 })();
}
