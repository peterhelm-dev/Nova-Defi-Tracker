import { describe, expect, it } from "vitest";
import { healthAlertSentence, HEALTH_FACTOR_GLOSS, loanDetailSentence, loanLinesFromPositions } from "./loanCopy";

describe("loan copy", () => {
  it("matches the alert wording and does not tell the reader what to do", () => {
    const sentence = healthAlertSentence({
      protocol: "Aave",
      market: null,
      chain: "base",
      healthFactor: 1.324,
      threshold: 1.5,
    });
    expect(sentence).toBe("Your Aave health factor on Base is 1.32, below your 1.5 alert.");
    const banned = ["add collateral", "repay", "you should", "now"];
    for (const word of banned) {
      expect(sentence.toLowerCase()).not.toContain(word);
      expect(HEALTH_FACTOR_GLOSS.toLowerCase()).not.toContain(word);
    }
  });

  it("names the market for Compound and glosses the price once", () => {
    const text = loanDetailSentence(
      {
        protocol: "Compound",
        market: "USDC",
        chain: "base",
        healthFactor: 1.32,
        liquidationPriceUsd: 1820.4,
        liquidationSymbol: "ETH",
        blended: true,
        covered: false,
      },
      false,
    );
    expect(text).toContain("Compound USDC on Base: health factor 1.32.");
    expect(text).toContain("Liquidation price for ETH");
    expect(text).toContain("blended threshold");
    expect(text).not.toContain("—");
  });

  it("dedupes the same loan stamped on supply and borrow rows", () => {
    const lines = loanLinesFromPositions([
      {
        protocol: "Aave",
        chain: "base",
        healthFactor: 1.8,
        liquidationPriceUsd: 1000,
        liquidationSymbol: "ETH",
        liquidationMarket: null,
      },
      {
        protocol: "Aave",
        chain: "base",
        healthFactor: 1.8,
        liquidationPriceUsd: 1000,
        liquidationSymbol: "ETH",
        liquidationMarket: null,
      },
      { protocol: "Lido", chain: "ethereum", healthFactor: null },
    ]);
    expect(lines).toHaveLength(1);
    expect(lines[0]?.protocol).toBe("Aave");
  });
});
