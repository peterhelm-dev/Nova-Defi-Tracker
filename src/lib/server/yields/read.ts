import type { PoolPoint } from "@/lib/research";
import type { DefiPool } from "@/types";
import type { YieldsProvider } from "./provider";

export type YieldSnapshot<T> = {
  data: T;
  unavailable: boolean;
};

/** A thrown provider becomes an empty snapshot. Callers hide APY panels instead of failing the page. */
export async function readYieldPools(source: YieldsProvider): Promise<YieldSnapshot<DefiPool[]>> {
  try {
    return { data: await source.listPools(), unavailable: false };
  } catch {
    return { data: [], unavailable: true };
  }
}

export async function readYieldChart(source: YieldsProvider, poolId: string): Promise<YieldSnapshot<PoolPoint[]>> {
  try {
    return { data: await source.getChart(poolId), unavailable: false };
  } catch {
    return { data: [], unavailable: true };
  }
}
