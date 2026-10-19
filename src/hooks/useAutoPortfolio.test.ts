import { describe, expect, it } from "vitest";
import { mergePortfolios } from "./useAutoPortfolio";
import type { AutoPortfolio } from "@/types";

function portfolio(partial: Partial<AutoPortfolio>): AutoPortfolio {
  return {
    address: "0x1",
    tokens: [],
    positions: [],
    walletUsd: 0,
    defiUsd: 0,
    totalUsd: 0,
    chains: [],
    provider: "alchemy",
    coverage: "detected",
    updatedAt: 0,
    ...partial,
  };
}

describe("mergePortfolios", () => {
  it("sums the same token held by two wallets", () => {
    const merged = mergePortfolios([
      portfolio({
        tokens: [
          {
            symbol: "ETH",
            name: "Ethereum",
            address: "native",
            decimals: 18,
            chain: "ethereum",
            iconUrl: null,
            fungibleId: null,
            balance: 1,
            priceUsd: 3000,
            change24h: null,
            valueUsd: 3000,
          },
        ],
        chains: ["ethereum"],
        walletUsd: 3000,
        totalUsd: 3000,
      }),
      portfolio({
        address: "0x2",
        tokens: [
          {
            symbol: "ETH",
            name: "Ethereum",
            address: "native",
            decimals: 18,
            chain: "ethereum",
            iconUrl: null,
            fungibleId: null,
            balance: 0.5,
            priceUsd: 3000,
            change24h: null,
            valueUsd: 1500,
          },
        ],
        chains: ["base"],
        walletUsd: 1500,
        totalUsd: 1500,
      }),
    ]);

    expect(merged?.tokens).toHaveLength(1);
    expect(merged?.tokens[0]?.balance).toBe(1.5);
    expect(merged?.walletUsd).toBe(4500);
    expect(merged?.chains.sort()).toEqual(["base", "ethereum"]);
  });

  it("marks the merge as major-tokens if any wallet used the public fallback", () => {
    const merged = mergePortfolios([
      portfolio({ coverage: "detected" }),
      portfolio({ coverage: "major-tokens", provider: "public" }),
    ]);
    expect(merged?.coverage).toBe("major-tokens");
  });
});
