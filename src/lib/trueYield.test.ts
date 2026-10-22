import { describe, expect, it } from "vitest";
import {
  actionGasUnits,
  claimCount,
  gasCostUsd,
  impermanentLoss,
  poolHasImpermanentLoss,
  trueYield,
  YIELD_GAS_UNITS,
} from "./trueYield";

describe("trueYield", () => {
  it("subtracts gas from a simple base APY and finds the break-even deposit", () => {
    const result = trueYield({
      depositUsd: 10_000,
      days: 365,
      baseApyPct: 5,
      rewardApyPct: 0,
      rewardHaircutPct: 0,
      ilFraction: 0,
      feeAprPct: null,
      gasUsd: 20,
    });
    expect(result.grossUsd).toBeCloseTo(500);
    expect(result.netUsd).toBeCloseTo(480);
    expect(result.netApyPct).toBeCloseTo(4.8);
    expect(result.breakEvenDepositUsd).toBeCloseTo(400);
  });

  it("haircuts reward APY only", () => {
    const result = trueYield({
      depositUsd: 1_000,
      days: 365,
      baseApyPct: 0,
      rewardApyPct: 10,
      rewardHaircutPct: 50,
      ilFraction: 0,
      feeAprPct: null,
      gasUsd: 0,
    });
    expect(result.rewardUsd).toBeCloseTo(50);
    expect(result.netUsd).toBeCloseTo(50);
  });

  it("treats impermanent loss as a drag and refuses a break-even when yield is negative", () => {
    const result = trueYield({
      depositUsd: 1_000,
      days: 365,
      baseApyPct: 1,
      rewardApyPct: 0,
      rewardHaircutPct: 0,
      ilFraction: 0.05,
      feeAprPct: null,
      gasUsd: 10,
    });
    expect(result.ilUsd).toBeCloseTo(50);
    expect(result.netUsd).toBeCloseTo(-50);
    expect(result.breakEvenDepositUsd).toBeNull();
  });
});

describe("impermanent loss and gas", () => {
  it("is zero when the price does not move", () => {
    expect(impermanentLoss(1)).toBeCloseTo(0);
    expect(impermanentLoss(2)).toBeGreaterThan(0.05);
    expect(impermanentLoss(2)).toBeLessThan(0.06);
  });

  it("only treats pairs with a volatile leg as IL markets", () => {
    expect(poolHasImpermanentLoss("USDC")).toBe(false);
    expect(poolHasImpermanentLoss("USDC-USDT")).toBe(false);
    expect(poolHasImpermanentLoss("WETH-USDC")).toBe(true);
  });

  it("counts one claim per 30 days of rewards, plus deposit and withdraw", () => {
    expect(claimCount(10, 5)).toBe(0);
    expect(claimCount(90, 5)).toBe(3);
    expect(claimCount(90, 0)).toBe(0);
    expect(actionGasUnits(90, 5)).toBe(
      YIELD_GAS_UNITS.deposit + YIELD_GAS_UNITS.withdraw + 3 * YIELD_GAS_UNITS.claim,
    );
  });

  it("prices gas in dollars from wei", () => {
    const usd = gasCostUsd(BigInt("20000000000"), 100_000, 2_000);
    expect(usd).toBeCloseTo(4);
  });
});
