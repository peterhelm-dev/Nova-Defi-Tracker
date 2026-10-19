import { describe, expect, it } from "vitest";
import {
  chartInterval,
  isCoinGeckoContractLimit,
  mapAlchemySpotPrices,
  mapHistoricalPrices,
  priceResponseHasData,
  usdFromAlchemyPrices,
} from "./prices";

describe("usdFromAlchemyPrices", () => {
  it("reads the usd quote and ignores other currencies", () => {
    expect(
      usdFromAlchemyPrices([
        { currency: "eur", value: "1" },
        { currency: "USD", value: "2400.5" },
      ]),
    ).toBe(2400.5);
  });
});

describe("mapAlchemySpotPrices", () => {
  it("maps ETH and Base token addresses into the price payload", () => {
    const prices = mapAlchemySpotPrices(
      [{ symbol: "ETH", prices: [{ currency: "usd", value: "2400" }] }],
      [
        {
          address: "0xAbC",
          prices: [{ currency: "usd", value: "1" }],
        },
        {
          address: "0xdef",
          error: "unsupported",
          prices: [{ currency: "usd", value: "9" }],
        },
      ],
    );

    expect(prices.eth?.usd).toBe(2400);
    expect(prices.tokens["0xabc"]?.usd).toBe(1);
    expect(prices.tokens["0xdef"]).toBeUndefined();
    expect(priceResponseHasData(prices)).toBe(true);
  });

  it("treats an empty payload as missing", () => {
    expect(priceResponseHasData(mapAlchemySpotPrices([], []))).toBe(false);
  });
});

describe("isCoinGeckoContractLimit", () => {
  it("recognizes the one-address limit that breaks the batched call", () => {
    expect(
      isCoinGeckoContractLimit(
        400,
        "Number of contract addresses in the request exceeds the allowed limit of 1 contract address",
      ),
    ).toBe(true);
    expect(isCoinGeckoContractLimit(429, "rate limit")).toBe(false);
  });
});

describe("mapHistoricalPrices", () => {
  it("converts ISO timestamps to chart points and drops junk", () => {
    const points = mapHistoricalPrices([
      { value: "100", timestamp: "2026-01-01T00:00:00Z" },
      { value: "nope", timestamp: "2026-01-02T00:00:00Z" },
    ]);
    expect(points).toEqual([{ t: Date.parse("2026-01-01T00:00:00Z"), priceUsd: 100 }]);
  });
});

describe("chartInterval", () => {
  it("stays inside Alchemy's historical range limits", () => {
    expect(chartInterval(1)).toBe("5m");
    expect(chartInterval(7)).toBe("1h");
    expect(chartInterval(30)).toBe("1h");
    expect(chartInterval(365)).toBe("1d");
  });
});
