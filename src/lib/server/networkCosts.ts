import { unstable_cache } from "next/cache";
import type { ChainCost } from "@/lib/dust";
import { nativeCoinId } from "@/lib/coingeckoPlatforms";
import { evmClient, nativeSymbol, trackedChains } from "./evm";

async function nativePrices(): Promise<Map<string, number>> {
  const ids = [...new Set(trackedChains().map((chain) => nativeCoinId(chain)).filter((id): id is string => Boolean(id)))];
  const prices = new Map<string, number>();
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=usd`,
      { cache: "no-store" },
    );
    if (!res.ok) return prices;
    const json = (await res.json()) as Record<string, { usd?: number }>;
    for (const [id, row] of Object.entries(json)) {
      if (typeof row.usd === "number") prices.set(id, row.usd);
    }
  } catch {
    return prices;
  }
  return prices;
}

async function loadNetworkCosts(): Promise<ChainCost[]> {
  const prices = await nativePrices();
  const costs = await Promise.all(
    trackedChains().map(async (chain) => {
      let gasPriceWei = "0";
      try {
        gasPriceWei = (await evmClient(chain).getGasPrice()).toString();
      } catch {
        gasPriceWei = "0";
      }
      const coin = nativeCoinId(chain);
      return {
        chain,
        nativeSymbol: nativeSymbol(chain),
        gasPriceWei,
        nativeUsd: coin ? (prices.get(coin) ?? null) : null,
      };
    }),
  );
  return costs;
}

export const getNetworkCosts = unstable_cache(loadNetworkCosts, ["network-costs-v1"], { revalidate: 120 });
