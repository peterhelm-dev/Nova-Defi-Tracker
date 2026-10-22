import { explorerTxUrl } from "@/lib/explorers";
import type { ActivityItem, ActivityTransfer } from "@/types";

/** One Alchemy asset transfer, already narrowed to the fields we show. */
export type TransferRow = {
  hash: string;
  from: string;
  to: string | null;
  asset: string | null;
  value: number | null;
  category: string;
  minedAt: string | null;
};

function actionFor(category: string): string {
  if (category === "erc721" || category === "erc1155" || category === "specialnft") return "nft";
  if (category === "erc20") return "token";
  if (category === "internal") return "internal";
  return "transfer";
}

/**
 * Groups Alchemy transfers that share a hash into one activity row.
 * Direction is relative to the watched wallet. Dollar values are left blank:
 * the transfer payload is a token amount, not a price.
 */
export function activityFromTransfers(wallet: string, chain: string, rows: TransferRow[]): ActivityItem[] {
  const me = wallet.toLowerCase();
  const byHash = new Map<string, ActivityItem>();

  for (const row of rows) {
    const hash = row.hash.toLowerCase();
    if (!hash.startsWith("0x")) continue;
    const direction: ActivityTransfer["direction"] = row.to?.toLowerCase() === me ? "in" : "out";
    const transfer: ActivityTransfer = {
      direction,
      symbol: row.asset?.trim() || "ETH",
      quantity: typeof row.value === "number" && Number.isFinite(row.value) ? row.value : 0,
      valueUsd: null,
    };
    const existing = byHash.get(hash);
    if (existing) {
      const duplicate = existing.transfers.some(
        (item) => item.symbol === transfer.symbol && item.direction === transfer.direction && item.quantity === transfer.quantity,
      );
      if (!duplicate) existing.transfers.push(transfer);
      continue;
    }
    byHash.set(hash, {
      id: `${chain}:${hash}`,
      type: actionFor(row.category),
      status: "confirmed",
      occurredAt: row.minedAt ?? "",
      hash,
      chain,
      explorerUrl: explorerTxUrl(chain, hash),
      transfers: [transfer],
    });
  }

  return [...byHash.values()].sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));
}
