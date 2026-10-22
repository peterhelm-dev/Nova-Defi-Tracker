import { describe, expect, it } from "vitest";
import {
  ALCHEMY_ADDRESS_LIMIT,
  alchemyOriginsToTry,
  chartInterval,
  chooseSpotPrices,
  chunkItems,
  isCoinGeckoContractLimit,
  mapAlchemySpotPrices,
  mapHistoricalPrices,
  mergePriceResponses,
  priceResponseHasData,
  shouldRetryAlchemyWithoutOrigin,
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

describe("chunkItems", () => {
  it("splits an Alchemy address list on the 25-item cap", () => {
    const items = Array.from({ length: 26 }, (_, index) => index);
    const chunks = chunkItems(items, ALCHEMY_ADDRESS_LIMIT);
    expect(chunks.map((chunk) => chunk.length)).toEqual([25, 1]);
    expect(chunkItems([], 25)).toEqual([]);
  });
});

describe("shouldRetryAlchemyWithoutOrigin", () => {
  it("retries only the domain-allowlist 403", () => {
    expect(shouldRetryAlchemyWithoutOrigin(403, "Unspecified origin not on whitelist.")).toBe(true);
    expect(shouldRetryAlchemyWithoutOrigin(403, "Origin www.novafolio.app is not on whitelist.")).toBe(true);
    expect(shouldRetryAlchemyWithoutOrigin(403, "Monthly capacity limit exceeded.")).toBe(false);
    expect(shouldRetryAlchemyWithoutOrigin(401, "whitelist")).toBe(false);
  });
});

describe("alchemyOriginsToTry", () => {
  it("tries the configured origin and both public Novafolio origins", () => {
    expect(alchemyOriginsToTry("https://novafolio.app")).toEqual([
      "https://novafolio.app",
      "https://www.novafolio.app",
    ]);
    expect(alchemyOriginsToTry("https://preview.example")).toEqual([
      "https://preview.example",
      "https://www.novafolio.app",
      "https://novafolio.app",
    ]);
  });
});

describe("mergePriceResponses", () => {
  it("keeps a token from one source and lets the later usd win", () => {
    const merged = mergePriceResponses([
      {
        tokens: { "0xabc": { usd: 1, usd_24h_change: 2 } },
        eth: { usd: 100, usd_24h_change: -1 },
      },
      {
        tokens: { "0xAbC": { usd: 1.5 }, "0xdef": { usd: 2 } },
        eth: { usd: 200 },
      },
    ]);

    expect(merged.eth).toEqual({ usd: 200, usd_24h_change: -1 });
    expect(merged.tokens["0xabc"]).toEqual({ usd: 1.5, usd_24h_change: 2 });
    expect(merged.tokens["0xdef"]?.usd).toBe(2);
  });
});

describe("chooseSpotPrices", () => {
  const good = { tokens: { "0xabc": { usd: 1 } }, eth: { usd: 2400 } };
  const empty = { tokens: {} };

  it("prefers a fresh payload and otherwise keeps the last good one", () => {
    expect(chooseSpotPrices(good, null)).toBe(good);
    expect(chooseSpotPrices(empty, good)).toBe(good);
    expect(chooseSpotPrices(null, good)).toBe(good);
    expect(chooseSpotPrices(empty, empty)).toBeNull();
    expect(chooseSpotPrices(null, null)).toBeNull();
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
