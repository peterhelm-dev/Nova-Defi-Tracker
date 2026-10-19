import { NextResponse } from "next/server";
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
const PER_CHAIN = 8;
const CHAINS = new Set([
  "Ethereum",
  "Base",
  "Arbitrum",
  "Optimism",
  "Polygon",
  "BSC",
  "Binance",
  "Avalanche",
]);

export async function GET() {
  try {
    const res = await fetch("https://yields.llama.fi/pools", {
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "DeFi data provider unavailable" },
        { status: 502 },
      );
    }

    const json = (await res.json()) as { data: LlamaPool[] };

    const byChain = new Map<string, LlamaPool[]>();
    for (const pool of json.data) {
      if (!CHAINS.has(pool.chain) || pool.tvlUsd < MIN_TVL_USD) continue;
      const list = byChain.get(pool.chain) ?? [];
      list.push(pool);
      byChain.set(pool.chain, list);
    }

    const picked: LlamaPool[] = [];
    for (const list of byChain.values()) {
      list.sort((a, b) => b.tvlUsd - a.tvlUsd);
      picked.push(...list.slice(0, PER_CHAIN));
    }
    picked.sort((a, b) => b.tvlUsd - a.tvlUsd);

    const pools: DefiPool[] = picked
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

    return NextResponse.json(
      { pools },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { error: "DeFi data provider unavailable" },
      { status: 502 },
    );
  }
}
