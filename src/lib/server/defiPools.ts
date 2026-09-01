import type { DefiPool } from "@/types";

type LlamaPool = {
  pool: string;
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apy: number | null;
  apyBase: number | null;
  apyReward: number | null;
};

const MIN_TVL_USD = 50_000;
const MAX_POOLS = 60;

/**
 * Fetches Base-chain yield pools from DeFiLlama. Shared by the /api/defi-pools
 * route and the AI chat tool so both apply the same TVL floor and cap.
 */
export async function fetchBaseDefiPools(
  revalidateSeconds = 300,
): Promise<DefiPool[] | null> {
  try {
    const res = await fetch("https://yields.llama.fi/pools", {
      next: { revalidate: revalidateSeconds },
    });
    if (!res.ok) return null;

    const json = (await res.json()) as { data: LlamaPool[] };

    return json.data
      .filter((pool) => pool.chain === "Base" && pool.tvlUsd >= MIN_TVL_USD)
      .sort((a, b) => b.tvlUsd - a.tvlUsd)
      .slice(0, MAX_POOLS)
      .map((pool) => ({
        id: pool.pool,
        project: pool.project,
        symbol: pool.symbol,
        chain: pool.chain,
        tvlUsd: pool.tvlUsd,
        apy: pool.apy,
        apyBase: pool.apyBase,
        apyReward: pool.apyReward,
      }));
  } catch {
    return null;
  }
}
