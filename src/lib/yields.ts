import type { DefiPool } from "@/types";

/** Shown wherever pool APY or TVL would have rendered and the yields source did not answer. */
export const POOL_DATA_UNAVAILABLE = "Pool data temporarily unavailable.";

const MIN_TVL_USD = 50_000;
const PER_CHAIN = 8;
const TRACKED_CHAINS = new Set([
  "Ethereum",
  "Base",
  "Arbitrum",
  "Optimism",
  "Polygon",
  "BSC",
  "Binance",
  "Avalanche",
]);

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Maps a DeFiLlama yields payload (`{ data: [...] }` from either host).
 * Throws when the body is not that shape, so a shutdown page is not cached as an empty pool list.
 */
export function mapLlamaPools(payload: unknown): DefiPool[] {
  const data = (payload as { data?: unknown })?.data;
  if (!Array.isArray(data)) throw new Error("yields payload");
  const pools: DefiPool[] = [];
  for (const entry of data) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const tvlUsd = num(row.tvlUsd);
    if (typeof row.pool !== "string" || tvlUsd === null || tvlUsd < MIN_TVL_USD) continue;
    pools.push({
      id: row.pool,
      project: typeof row.project === "string" ? row.project : "",
      symbol: typeof row.symbol === "string" ? row.symbol : "",
      chain: typeof row.chain === "string" ? row.chain : "",
      tvlUsd,
      apy: num(row.apy),
      apyBase: num(row.apyBase),
      apyReward: num(row.apyReward),
    });
  }
  if (data.length > 0 && pools.length === 0) throw new Error("yields payload");
  return pools;
}

/** The dashboard table: major chains, largest pools first, a few per chain. */
export function curateTrackedPools(pools: DefiPool[]): DefiPool[] {
  const byChain = new Map<string, DefiPool[]>();
  for (const pool of pools) {
    if (!TRACKED_CHAINS.has(pool.chain)) continue;
    const list = byChain.get(pool.chain) ?? [];
    list.push(pool);
    byChain.set(pool.chain, list);
  }
  const picked: DefiPool[] = [];
  for (const list of byChain.values()) {
    list.sort((a, b) => b.tvlUsd - a.tvlUsd);
    picked.push(...list.slice(0, PER_CHAIN));
  }
  picked.sort((a, b) => b.tvlUsd - a.tvlUsd);
  return picked;
}
