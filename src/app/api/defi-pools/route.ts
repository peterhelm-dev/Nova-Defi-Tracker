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
const MAX_POOLS = 60;

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

    const pools: DefiPool[] = json.data
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
