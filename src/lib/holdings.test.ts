import { describe, expect, it } from "vitest";
import { buildHoldings, sumHoldingsUsd } from "./holdings";
import type { BaseToken } from "./tokens";
import type { PriceResponse } from "@/types";

const TOKENS: BaseToken[] = [
  { symbol: "USDC", name: "USD Coin", address: "0xAAA", decimals: 6, iconUrl: "https://example.com/usdc.png" },
  { symbol: "WETH", name: "Wrapped Ether", address: "0xBBB", decimals: 18, iconUrl: "https://example.com/weth.png" },
];

describe("buildHoldings", () => {
  it("merges ETH and ERC-20 balances with prices into priced holdings", () => {
    const prices: PriceResponse = {
      tokens: {
        "0xaaa": { usd: 1, usd_24h_change: 0.1 },
        "0xbbb": { usd: 3000, usd_24h_change: -2 },
      },
      eth: { usd: 3200, usd_24h_change: 1.5 },
    };

    const holdings = buildHoldings({
      ethFormattedBalance: "0.5",
      erc20Results: [
        { status: "success", result: BigInt(100_000_000) }, // 100 USDC
        { status: "success", result: BigInt(0) },
      ],
      prices,
      tokens: TOKENS,
    });

    expect(holdings).toHaveLength(2);
    const eth = holdings.find((h) => h.symbol === "ETH");
    const usdc = holdings.find((h) => h.symbol === "USDC");

    expect(eth?.valueUsd).toBeCloseTo(1600);
    expect(usdc?.balance).toBeCloseTo(100);
    expect(usdc?.valueUsd).toBeCloseTo(100);
    // zero-balance WETH is filtered out
    expect(holdings.find((h) => h.symbol === "WETH")).toBeUndefined();
  });

  it("sorts holdings by USD value descending", () => {
    const prices: PriceResponse = {
      tokens: { "0xaaa": { usd: 1 }, "0xbbb": { usd: 3000 } },
      eth: { usd: 3000 },
    };

    const holdings = buildHoldings({
      ethFormattedBalance: "1",
      erc20Results: [
        { status: "success", result: BigInt(5_000_000) }, // 5 USDC
        { status: "success", result: BigInt(0) },
      ],
      prices,
      tokens: TOKENS,
    });

    expect(holdings.map((h) => h.symbol)).toEqual(["ETH", "USDC"]);
  });

  it("treats failed multicall reads as zero balance", () => {
    const holdings = buildHoldings({
      ethFormattedBalance: "0",
      erc20Results: [{ status: "failure" }, undefined],
      prices: undefined,
      tokens: TOKENS,
    });

    expect(holdings).toHaveLength(0);
  });

  it("returns null priceUsd when a token has no price entry", () => {
    const holdings = buildHoldings({
      ethFormattedBalance: "0",
      erc20Results: [{ status: "success", result: BigInt(1_000_000) }, undefined],
      prices: { tokens: {} },
      tokens: TOKENS,
    });

    expect(holdings[0].priceUsd).toBeNull();
    expect(holdings[0].valueUsd).toBe(0);
  });
});

describe("sumHoldingsUsd", () => {
  it("sums valueUsd across holdings", () => {
    const total = sumHoldingsUsd([
      { symbol: "A", name: "A", address: "0x1", decimals: 18, chain: "base", iconUrl: null, fungibleId: null, balance: 1, priceUsd: 2, change24h: null, valueUsd: 2 },
      { symbol: "B", name: "B", address: "0x2", decimals: 18, chain: "base", iconUrl: null, fungibleId: null, balance: 1, priceUsd: 3, change24h: null, valueUsd: 3 },
    ]);
    expect(total).toBe(5);
  });

  it("returns 0 for an empty list", () => {
    expect(sumHoldingsUsd([])).toBe(0);
  });
});
