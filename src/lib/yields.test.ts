import { describe, expect, it } from "vitest";
import type { YieldsProvider } from "./server/yields/provider";
import { readYieldChart, readYieldPools } from "./server/yields/read";
import { curateTrackedPools, mapLlamaPools, POOL_DATA_UNAVAILABLE } from "./yields";
import type { DefiPool } from "@/types";

function pool(partial: Partial<DefiPool> & Pick<DefiPool, "id" | "chain" | "tvlUsd">): DefiPool {
  return {
    project: "aave-v3",
    symbol: "USDC",
    apy: 1,
    apyBase: 1,
    apyReward: null,
    ...partial,
  };
}

describe("yields provider seam", () => {
  it("maps a llama payload and curates the dashboard table", () => {
    const pools = mapLlamaPools({
      data: [
        { pool: "eth-1", chain: "Ethereum", project: "aave-v3", symbol: "USDC", tvlUsd: 80_000, apy: 4, apyBase: 3, apyReward: 1 },
        { pool: "dust", chain: "Ethereum", project: "tiny", symbol: "X", tvlUsd: 10 },
        { pool: "sol", chain: "Solana", project: "marinade", symbol: "SOL", tvlUsd: 90_000, apy: 2 },
      ],
    });
    expect(pools.map((item) => item.id)).toEqual(["eth-1", "sol"]);
    expect(pools[0].apyReward).toBe(1);
    expect(curateTrackedPools(pools).map((item) => item.id)).toEqual(["eth-1"]);
  });

  it("rejects a payload that is not a pool list", () => {
    expect(() => mapLlamaPools({ status: "error" })).toThrow(/yields payload/);
  });

  it("turns a failing provider into an empty snapshot and keeps a working one", async () => {
    const down: YieldsProvider = {
      name: "down",
      listPools: async () => {
        throw new Error("shutdown");
      },
      getChart: async () => {
        throw new Error("shutdown");
      },
    };
    const up: YieldsProvider = {
      name: "up",
      listPools: async () => [pool({ id: "p", chain: "Base", tvlUsd: 100_000 })],
      getChart: async () => [{ t: 1, tvlUsd: 10, apy: 2, apyBase: 1, apyReward: 1 }],
    };
    expect(await readYieldPools(down)).toEqual({ data: [], unavailable: true });
    expect(await readYieldChart(down, "p")).toEqual({ data: [], unavailable: true });
    expect((await readYieldPools(up)).data).toHaveLength(1);
    expect((await readYieldChart(up, "p")).unavailable).toBe(false);
    expect(POOL_DATA_UNAVAILABLE).toBe("Pool data temporarily unavailable.");
  });

  it("keeps the largest pools per chain", () => {
    const pools = Array.from({ length: 9 }, (_, index) =>
      pool({ id: `e${index}`, chain: "Ethereum", tvlUsd: (index + 1) * 100_000 }),
    );
    pools.push(pool({ id: "base", chain: "Base", tvlUsd: 50_000 }));
    const curated = curateTrackedPools(pools);
    expect(curated.filter((item) => item.chain === "Ethereum")).toHaveLength(8);
    expect(curated[0].id).toBe("e8");
    expect(curated.some((item) => item.id === "base")).toBe(true);
    expect(curated.some((item) => item.id === "e0")).toBe(false);
  });
});
