import { describe, expect, it } from "vitest";
import type { TokenHolding } from "@/types";
import { dustReport, type ChainCost } from "./dust";

function holding(partial: Partial<TokenHolding> & Pick<TokenHolding, "symbol" | "address" | "chain" | "valueUsd">): TokenHolding {
  return {
    name: partial.symbol,
    decimals: 18,
    iconUrl: null,
    fungibleId: null,
    balance: 1,
    priceUsd: 1,
    change24h: null,
    ...partial,
  };
}

const costs: ChainCost[] = [
  { chain: "ethereum", nativeSymbol: "ETH", gasPriceWei: "20000000000", nativeUsd: 2000 },
  { chain: "base", nativeSymbol: "ETH", gasPriceWei: "10000000", nativeUsd: 2000 },
];

describe("dustReport", () => {
  it("flags a token worth less than the gas to move it, and tokens with no gas", () => {
    const report = dustReport(
      [
        holding({ symbol: "ETH", address: "native", chain: "ethereum", valueUsd: 40 }),
        holding({ symbol: "DUST", address: "0x1", chain: "ethereum", valueUsd: 0.2 }),
        holding({ symbol: "USDC", address: "0x2", chain: "base", valueUsd: 25 }),
      ],
      costs,
    );
    expect(report.trapped.map((row) => row.symbol)).toEqual(["DUST"]);
    expect(report.stranded.map((row) => row.symbol)).toContain("USDC");
    expect(report.idle.find((row) => row.chain === "base")?.valueUsd).toBe(0);
    expect(report.idle.find((row) => row.chain === "ethereum")?.valueUsd).toBe(40);
  });

  it("flags native gas that cannot pay for its own transfer", () => {
    const report = dustReport(
      [holding({ symbol: "ETH", address: "native", chain: "ethereum", valueUsd: 0.1 })],
      costs,
    );
    expect(report.trapped.map((row) => row.symbol)).toEqual(["ETH"]);
    expect(report.trapped[0]?.moveCostUsd).toBeGreaterThan(0.1);
  });
});
