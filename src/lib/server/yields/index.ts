import { unstable_cache } from "next/cache";
import type { PoolPoint } from "@/lib/research";
import type { DefiPool } from "@/types";
import { LlamaYieldsProvider } from "./llama";
import type { YieldsProvider } from "./provider";
import { readYieldChart, readYieldPools, type YieldSnapshot } from "./read";

export type { YieldsProvider } from "./provider";
export { readYieldChart, readYieldPools, type YieldSnapshot };

let provider: YieldsProvider | undefined;

/** Free DeFiLlama yields, or the Pro yields paths when DEFILLAMA_API_KEY is set. */
export function getYieldsProvider(): YieldsProvider {
  if (!provider) {
    const key = process.env.DEFILLAMA_API_KEY?.trim() || null;
    provider = new LlamaYieldsProvider(key);
  }
  return provider;
}

const poolsCached = unstable_cache(
  async () => {
    const snapshot = await readYieldPools(getYieldsProvider());
    if (snapshot.unavailable) throw new Error("yields unavailable");
    return snapshot.data;
  },
  ["yields-pools-v1"],
  { revalidate: 600 },
);

const chartCached = unstable_cache(
  async (poolId: string) => {
    const snapshot = await readYieldChart(getYieldsProvider(), poolId);
    if (snapshot.unavailable) throw new Error("yields chart unavailable");
    return snapshot.data;
  },
  ["yields-chart-v1"],
  { revalidate: 900 },
);

export async function loadYieldPools(): Promise<YieldSnapshot<DefiPool[]>> {
  try {
    return { data: await poolsCached(), unavailable: false };
  } catch {
    return { data: [], unavailable: true };
  }
}

export async function loadYieldChart(poolId: string): Promise<YieldSnapshot<PoolPoint[]>> {
  try {
    return { data: await chartCached(poolId), unavailable: false };
  } catch {
    return { data: [], unavailable: true };
  }
}
