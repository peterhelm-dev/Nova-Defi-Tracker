import { unstable_cache } from "next/cache";
import { GAS_WINDOW_DAYS, summarizeGasSpend, type GasSample } from "@/lib/gasSpend";
import { siteOrigin } from "@/lib/server/prices";
import { ALCHEMY_NETWORKS } from "@/lib/server/portfolio/alchemy";
import { getNetworkCosts } from "@/lib/server/networkCosts";

const MAX_PER_CHAIN = 20;

type TransferRow = {
  hash?: string;
  from?: string;
  metadata?: { blockTimestamp?: string };
};

type RpcReceipt = {
  status?: string;
  gasUsed?: string;
  effectiveGasPrice?: string;
  from?: string;
  l1Fee?: string;
};

type RpcTransaction = {
  input?: string;
  gasPrice?: string;
  from?: string;
};

function alchemyKey(): string | null {
  const key = process.env.ALCHEMY_API_KEY?.trim();
  return key ? key : null;
}

async function alchemyCall(network: string, method: string, params: unknown): Promise<unknown> {
  const key = alchemyKey();
  if (!key) throw new Error("ALCHEMY_API_KEY is not set");
  const res = await fetch(`https://${network}.g.alchemy.com/v2/${key}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: siteOrigin() },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${method} ${res.status}`);
  const json = (await res.json()) as { result?: unknown; error?: { message?: string } };
  if (json.error) throw new Error(json.error.message ?? method);
  return json.result;
}

async function alchemyBatch(network: string, calls: { method: string; params: unknown[] }[]): Promise<unknown[]> {
  const key = alchemyKey();
  if (!key || calls.length === 0) return [];
  const res = await fetch(`https://${network}.g.alchemy.com/v2/${key}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: siteOrigin() },
    body: JSON.stringify(
      calls.map((call, id) => ({ jsonrpc: "2.0", id, method: call.method, params: call.params })),
    ),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`batch ${res.status}`);
  const json = (await res.json()) as { id?: number; result?: unknown }[];
  const byId = new Map((Array.isArray(json) ? json : []).map((row) => [row.id, row.result]));
  return calls.map((_, id) => byId.get(id));
}

function hex(value: string | undefined): bigint {
  if (!value || value === "0x") return BigInt(0);
  try {
    return BigInt(value);
  } catch {
    return BigInt(0);
  }
}

async function outgoingTransfers(network: string, address: string): Promise<TransferRow[]> {
  const attempts = [
    ["external", "erc20", "erc721", "erc1155"],
    ["external", "erc20"],
  ];
  let lastError: unknown;
  for (const category of attempts) {
    try {
      const result = (await alchemyCall(network, "alchemy_getAssetTransfers", [
        {
          fromAddress: address,
          category,
          withMetadata: true,
          excludeZeroValue: false,
          maxCount: `0x${MAX_PER_CHAIN.toString(16)}`,
          order: "desc",
        },
      ])) as { transfers?: TransferRow[] };
      return result?.transfers ?? [];
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("transfers");
}

async function samplesForChain(network: string, chain: string, address: string): Promise<GasSample[]> {
  const transfers = await outgoingTransfers(network, address);
  const unique = new Map<string, TransferRow>();
  for (const transfer of transfers) {
    const hash = transfer.hash?.toLowerCase();
    if (!hash || unique.has(hash)) continue;
    unique.set(hash, transfer);
    if (unique.size >= MAX_PER_CHAIN) break;
  }
  const rows = [...unique.entries()];
  if (rows.length === 0) return [];

  const calls = rows.flatMap(([, transfer]) => [
    { method: "eth_getTransactionReceipt", params: [transfer.hash] },
    { method: "eth_getTransactionByHash", params: [transfer.hash] },
  ]);
  const results = await alchemyBatch(network, calls);
  const samples: GasSample[] = [];
  rows.forEach(([, transfer], index) => {
    const receipt = results[index * 2] as RpcReceipt | null | undefined;
    const tx = results[index * 2 + 1] as RpcTransaction | null | undefined;
    if (!receipt?.gasUsed) return;
    const price = receipt.effectiveGasPrice ?? tx?.gasPrice;
    samples.push({
      chain,
      hash: transfer.hash ?? "",
      from: (receipt.from ?? tx?.from ?? transfer.from ?? "").toLowerCase(),
      status: receipt.status === "0x0" ? "failed" : "success",
      gasUsed: hex(receipt.gasUsed),
      effectiveGasPriceWei: hex(price),
      l1FeeWei: receipt.l1Fee ? hex(receipt.l1Fee) : BigInt(0),
      input: tx?.input ?? "0x",
      minedAt: transfer.metadata?.blockTimestamp ?? null,
    });
  });
  return samples;
}

async function loadAlchemyGasSpend(address: string) {
  const costs = await getNetworkCosts();
  const nativeUsd: Record<string, number | null> = {};
  for (const cost of costs) nativeUsd[cost.chain] = cost.nativeUsd;

  const settled = await Promise.all(
    ALCHEMY_NETWORKS.map(async (entry) => {
      try {
        return { samples: await samplesForChain(entry.network, entry.chain, address), partial: false };
      } catch (error) {
        console.error(`Gas history failed on ${entry.chain}`, error instanceof Error ? error.message : "unknown");
        return { samples: [] as GasSample[], partial: true };
      }
    }),
  );

  return summarizeGasSpend({
    wallet: address,
    samples: settled.flatMap((row) => row.samples),
    nativeUsd,
    windowDays: GAS_WINDOW_DAYS,
    partial: settled.some((row) => row.partial),
  });
}

/** Recent gas paid, from Alchemy transfers plus receipts. Null when no Alchemy key is set. */
export async function readAlchemyGasSpend(address: string) {
  if (!alchemyKey()) return null;
  const normalized = address.toLowerCase();
  return unstable_cache(() => loadAlchemyGasSpend(normalized), ["gas-spend-alchemy-v1", normalized], {
    revalidate: 600,
  })();
}
