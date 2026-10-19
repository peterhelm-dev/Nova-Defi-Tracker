import { describe, expect, it } from "vitest";
import { mapAlchemyTokens, networkBatches, type AlchemyToken } from "./alchemy";

const eth: AlchemyToken = {
  network: "eth-mainnet",
  tokenAddress: null,
  tokenBalance: "0x0de0b6b3a7640000", // 1 ETH
  tokenMetadata: { decimals: 18, name: "Ethereum", symbol: "ETH", logo: "https://example/eth.png" },
  tokenPrices: [{ currency: "usd", value: "3000" }],
};

const usdc: AlchemyToken = {
  network: "base-mainnet",
  tokenAddress: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
  tokenBalance: "0x1e8480", // 2 USDC at 6 decimals
  tokenMetadata: { decimals: 6, name: "USD Coin", symbol: "USDC" },
  tokenPrices: [{ currency: "usd", value: "1" }],
};

const dust: AlchemyToken = {
  network: "arb-mainnet",
  tokenAddress: "0x1111111111111111111111111111111111111111",
  tokenBalance: "0x01",
  tokenMetadata: { decimals: 18, name: "Dust", symbol: "DUST" },
  tokenPrices: [{ currency: "usd", value: "0.0000001" }],
};

const spam: AlchemyToken = {
  network: "polygon-mainnet",
  tokenAddress: "0x2222222222222222222222222222222222222222",
  tokenBalance: "0x0de0b6b3a7640000",
  tokenMetadata: { decimals: 18, name: "Visit scam.example", symbol: "CLAIM" },
};

describe("mapAlchemyTokens", () => {
  const portfolio = mapAlchemyTokens("0xABCDEF", [eth, usdc, dust, spam, { network: "eth-mainnet", tokenBalance: "0x0" }]);

  it("keeps priced tokens and drops dust and unpriced spam", () => {
    expect(portfolio.tokens.map((token) => token.symbol)).toEqual(["ETH", "USDC"]);
    expect(portfolio.walletUsd).toBe(3002);
    expect(portfolio.coverage).toBe("detected");
    expect(portfolio.provider).toBe("alchemy");
  });

  it("maps networks onto the app's chain ids", () => {
    expect(portfolio.chains.sort()).toEqual(["base", "ethereum"]);
    expect(portfolio.tokens[0]?.address).toBe("native");
    expect(portfolio.tokens[1]?.balance).toBeCloseTo(2);
  });
});

describe("networkBatches", () => {
  it("stays within Alchemy's 5-network cap and still covers BNB and Avalanche", () => {
    const batches = networkBatches();
    expect(batches.every((batch) => batch.length <= 5)).toBe(true);
    expect(batches.flat()).toEqual(
      expect.arrayContaining(["eth-mainnet", "base-mainnet", "bnb-mainnet", "avax-mainnet"]),
    );
  });
});
