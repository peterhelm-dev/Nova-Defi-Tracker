import type { AlertEvent, AlertRule, PriceResponse } from "@/types";

/** Resolve a rule's current USD price from the standard price payload. */
export function priceForToken(
  prices: PriceResponse,
  tokenAddress: string,
): number | null {
  if (tokenAddress === "native") return prices.eth?.usd ?? null;
  return prices.tokens?.[tokenAddress.toLowerCase()]?.usd ?? null;
}

/**
 * Evaluates alert rules against current prices. Pure so it's unit-testable.
 *
 * Semantics: a rule fires when it is armed and the price is at/past its
 * threshold; firing disarms it. It re-arms only once the price has crossed
 * back to the other side. Net effect: one alert per threshold crossing, no
 * hourly repeats while the price sits past the line. Rules whose price is
 * unavailable are left untouched.
 */
export function evaluateAlertRules(
  rules: AlertRule[],
  prices: PriceResponse,
  now: number = Date.now(),
): { rules: AlertRule[]; events: AlertEvent[] } {
  const events: AlertEvent[] = [];

  const nextRules = rules.map((rule) => {
    const price = priceForToken(prices, rule.tokenAddress);
    if (price === null) return rule;

    const crossed =
      rule.direction === "above"
        ? price >= rule.thresholdUsd
        : price <= rule.thresholdUsd;

    if (rule.armed && crossed) {
      events.push({
        id: crypto.randomUUID(),
        ruleId: rule.id,
        symbol: rule.symbol,
        direction: rule.direction,
        thresholdUsd: rule.thresholdUsd,
        priceUsd: price,
        triggeredAt: now,
      });
      return { ...rule, armed: false };
    }

    if (!rule.armed && !crossed) {
      return { ...rule, armed: true };
    }

    return rule;
  });

  return { rules: nextRules, events };
}
