import { describe, expect, it } from "vitest";
import { evaluateAlertRules, priceForToken } from "./alerts";
import type { AlertRule, PriceResponse } from "@/types";

const USDC = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";

const prices: PriceResponse = {
  tokens: { [USDC]: { usd: 1.0 } },
  eth: { usd: 3000 },
};

function rule(overrides: Partial<AlertRule>): AlertRule {
  return {
    id: "r1",
    symbol: "ETH",
    tokenAddress: "native",
    direction: "above",
    thresholdUsd: 2500,
    armed: true,
    createdAt: 0,
    ...overrides,
  };
}

describe("priceForToken", () => {
  it("resolves native ETH and token addresses case-insensitively", () => {
    expect(priceForToken(prices, "native")).toBe(3000);
    expect(priceForToken(prices, USDC.toUpperCase())).toBe(1.0);
    expect(priceForToken(prices, "0xdead")).toBeNull();
  });
});

describe("evaluateAlertRules", () => {
  it("fires and disarms when an armed rule crosses its threshold", () => {
    const { rules, events } = evaluateAlertRules([rule({})], prices, 42);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      ruleId: "r1",
      symbol: "ETH",
      priceUsd: 3000,
      thresholdUsd: 2500,
      triggeredAt: 42,
    });
    expect(rules[0].armed).toBe(false);
  });

  it("does not refire while the price stays past the threshold", () => {
    const fired = rule({ armed: false });
    const { rules, events } = evaluateAlertRules([fired], prices);
    expect(events).toHaveLength(0);
    expect(rules[0].armed).toBe(false);
  });

  it("re-arms once the price crosses back", () => {
    const fired = rule({ armed: false, thresholdUsd: 3500 }); // price 3000 < 3500
    const { rules, events } = evaluateAlertRules([fired], prices);
    expect(events).toHaveLength(0);
    expect(rules[0].armed).toBe(true);
  });

  it("handles below-direction rules", () => {
    const below = rule({ direction: "below", thresholdUsd: 3200 }); // 3000 ≤ 3200
    const { events } = evaluateAlertRules([below], prices);
    expect(events).toHaveLength(1);
  });

  it("leaves rules untouched when the price is unavailable", () => {
    const unknown = rule({ tokenAddress: "0xdead", armed: true });
    const { rules, events } = evaluateAlertRules([unknown], prices);
    expect(events).toHaveLength(0);
    expect(rules[0]).toEqual(unknown);
  });

  it("does not fire an armed rule that has not crossed", () => {
    const waiting = rule({ thresholdUsd: 5000 }); // 3000 < 5000
    const { rules, events } = evaluateAlertRules([waiting], prices);
    expect(events).toHaveLength(0);
    expect(rules[0].armed).toBe(true);
  });
});
