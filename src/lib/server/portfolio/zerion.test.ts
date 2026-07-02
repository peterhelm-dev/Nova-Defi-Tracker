import { describe, expect, it } from "vitest";
import { mapZerionPositions, type ZerionPositionsResponse } from "./zerion";

const fixture: ZerionPositionsResponse = {
  data: [
    {
      id: "eth-wallet",
      attributes: {
        value: 3000,
        price: 3000,
        quantity: { float: 1 },
        position_type: "wallet",
        fungible_info: {
          name: "Ethereum",
          symbol: "ETH",
          implementations: [{ address: null, decimals: 18 }],
        },
        changes: { percent_1d: 2.5 },
        flags: { displayable: true },
      },
      relationships: { chain: { data: { id: "base" } } },
    },
    {
      id: "usdc-wallet",
      attributes: {
        value: 500,
        price: 1,
        quantity: { float: 500 },
        position_type: "wallet",
        fungible_info: {
          name: "USD Coin",
          symbol: "USDC",
          implementations: [{ address: "0x833...", decimals: 6 }],
        },
        flags: { displayable: true },
      },
      relationships: { chain: { data: { id: "ethereum" } } },
    },
    {
      id: "aero-lp",
      attributes: {
        value: 1200,
        position_type: "deposit",
        fungible_info: { name: "USDC/WETH LP", symbol: "USDC-WETH" },
        flags: { displayable: true },
      },
      relationships: {
        chain: { data: { id: "base" } },
        dapp: { data: { id: "aerodrome" } },
      },
    },
    {
      id: "hidden-dust",
      attributes: {
        value: 0.0001,
        position_type: "wallet",
        fungible_info: { symbol: "SPAM" },
        flags: { displayable: false },
      },
      relationships: { chain: { data: { id: "base" } } },
    },
    {
      id: "zero-value",
      attributes: {
        value: 0,
        position_type: "wallet",
        fungible_info: { symbol: "ZERO" },
        flags: { displayable: true },
      },
      relationships: { chain: { data: { id: "base" } } },
    },
  ],
};

describe("mapZerionPositions", () => {
  const portfolio = mapZerionPositions("0xABCDEF", fixture);

  it("splits wallet tokens from DeFi positions", () => {
    expect(portfolio.tokens.map((t) => t.symbol)).toEqual(["ETH", "USDC"]);
    expect(portfolio.positions.map((p) => p.symbol)).toEqual(["USDC-WETH"]);
  });

  it("sums wallet and defi USD separately", () => {
    expect(portfolio.walletUsd).toBe(3500);
    expect(portfolio.defiUsd).toBe(1200);
    expect(portfolio.totalUsd).toBe(4700);
  });

  it("collects the distinct chains", () => {
    expect(portfolio.chains.sort()).toEqual(["base", "ethereum"]);
  });

  it("carries protocol and kind onto detected positions", () => {
    expect(portfolio.positions[0]).toMatchObject({
      protocol: "aerodrome",
      kind: "deposit",
      chain: "base",
    });
  });

  it("skips non-displayable and zero-value entries", () => {
    const symbols = [
      ...portfolio.tokens.map((t) => t.symbol),
      ...portfolio.positions.map((p) => p.symbol),
    ];
    expect(symbols).not.toContain("SPAM");
    expect(symbols).not.toContain("ZERO");
  });

  it("lower-cases the address and tags the provider", () => {
    expect(portfolio.address).toBe("0xabcdef");
    expect(portfolio.provider).toBe("zerion");
  });
});
