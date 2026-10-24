import { describe, expect, it } from "vitest";
import {
  assessAaveAccount,
  assessLoan,
  priceToUsd8,
  scaleFromDecimals,
  usd8FromAmount,
  type CollateralLeg,
} from "./liquidation";

const E8 = BigInt(10) ** BigInt(8);
const E18 = BigInt(10) ** BigInt(18);

function leg(partial: Partial<CollateralLeg> & Pick<CollateralLeg, "symbol" | "usd8">): CollateralLeg {
  return {
    amountRaw: partial.amountRaw ?? BigInt(1),
    scale: partial.scale ?? BigInt(1),
    factor1e18: partial.factor1e18 ?? E18,
    ...partial,
  };
}

describe("usd8FromAmount", () => {
  it("keeps 6-decimal and 18-decimal amounts exact", () => {
    expect(usd8FromAmount(BigInt(1_500_000), scaleFromDecimals(6), 1)).toBe(BigInt(15) * E8 / BigInt(10));
    expect(usd8FromAmount(BigInt(10) ** BigInt(18), scaleFromDecimals(18), 2000)).toBe(BigInt(2000) * E8);
  });

  it("does not collapse a balance past the safe integer range", () => {
    const raw = BigInt(10_000_000) * BigInt(10) ** BigInt(18);
    expect(usd8FromAmount(raw, scaleFromDecimals(18), 2000)).toBe(BigInt(20_000_000_000) * E8);
  });

  it("rounds a price to 8 decimals", () => {
    expect(priceToUsd8(1.234567891)).toBe(BigInt(123456789));
  });
});

describe("assessLoan", () => {
  it("returns nothing when there is no debt", () => {
    const result = assessLoan(BigInt(0), [leg({ symbol: "WETH", usd8: BigInt(1000) * E8 })]);
    expect(result.healthFactor).toBeNull();
    expect(result.liquidationPriceUsd).toBeNull();
  });

  it("prices the only collateral at the health-factor boundary", () => {
    const amount = BigInt(10) * E18;
    const result = assessLoan(BigInt(8000) * E8, [
      leg({
        symbol: "WETH",
        usd8: BigInt(20000) * E8,
        amountRaw: amount,
        scale: E18,
        factor1e18: BigInt(8) * E18 / BigInt(10),
      }),
    ]);
    expect(result.healthFactor).toBeCloseTo(2, 6);
    expect(result.liquidationPriceUsd).toBeCloseTo(1000, 4);
    expect(result.liquidationSymbol).toBe("ETH");
    expect(result.blended).toBe(false);
  });

  it("puts the liquidation price on the current price when health is exactly 1", () => {
    const result = assessLoan(BigInt(16000) * E8, [
      leg({
        symbol: "ETH",
        usd8: BigInt(20000) * E8,
        amountRaw: BigInt(10) * E18,
        scale: E18,
        factor1e18: BigInt(8) * E18 / BigInt(10),
      }),
    ]);
    expect(result.healthFactor).toBeCloseTo(1, 6);
    expect(result.liquidationPriceUsd).toBeCloseTo(2000, 2);
  });

  it("sets a liquidation price just under the current price when health is just above 1", () => {
    const result = assessLoan(BigInt(15990) * E8, [
      leg({
        symbol: "ETH",
        usd8: BigInt(20000) * E8,
        amountRaw: BigInt(10) * E18,
        scale: E18,
        factor1e18: BigInt(8) * E18 / BigInt(10),
      }),
    ]);
    expect(result.healthFactor).toBeGreaterThan(1);
    expect(result.liquidationPriceUsd).toBeLessThan(2000);
    expect(result.liquidationPriceUsd).toBeGreaterThan(1990);
  });

  it("uses the largest collateral when the threshold is blended", () => {
    const result = assessLoan(BigInt(8000) * E8, [
      leg({
        symbol: "ETH",
        usd8: BigInt(20000) * E8,
        amountRaw: BigInt(10) * E18,
        scale: E18,
        factor1e18: BigInt(8) * E18 / BigInt(10),
      }),
      leg({
        symbol: "USDC",
        usd8: BigInt(5000) * E8,
        amountRaw: BigInt(5000) * BigInt(10) ** BigInt(6),
        scale: BigInt(10) ** BigInt(6),
        factor1e18: BigInt(8) * E18 / BigInt(10),
      }),
    ]);
    expect(result.healthFactor).toBeCloseTo(2.5, 6);
    expect(result.liquidationSymbol).toBe("ETH");
    expect(result.liquidationPriceUsd).toBeCloseTo(500, 2);
    expect(result.blended).toBe(true);
  });

  it("says there is no single price when other collateral already covers the debt", () => {
    const result = assessLoan(BigInt(8000) * E8, [
      leg({
        symbol: "ETH",
        usd8: BigInt(30000) * E8,
        amountRaw: BigInt(10) * E18,
        scale: E18,
        factor1e18: BigInt(8) * E18 / BigInt(10),
      }),
      leg({
        symbol: "USDC",
        usd8: BigInt(20000) * E8,
        amountRaw: BigInt(20000) * BigInt(10) ** BigInt(6),
        scale: BigInt(10) ** BigInt(6),
        factor1e18: BigInt(8) * E18 / BigInt(10),
      }),
    ]);
    expect(result.liquidationSymbol).toBe("ETH");
    expect(result.liquidationPriceUsd).toBeNull();
    expect(result.coveredByOtherCollateral).toBe(true);
  });

  it("keeps a per-asset Compound factor instead of one blended threshold", () => {
    const result = assessLoan(BigInt(500) * E8, [
      leg({
        symbol: "cbETH",
        usd8: BigInt(1000) * E8,
        amountRaw: BigInt(10) ** BigInt(18),
        scale: E18,
        factor1e18: BigInt(8) * E18 / BigInt(10),
      }),
    ]);
    expect(result.healthFactor).toBeCloseTo(1.6, 6);
    expect(result.liquidationPriceUsd).toBeCloseTo(625, 2);
  });
});

describe("assessAaveAccount", () => {
  it("prefers the pool health factor and prices the supplied collateral", () => {
    const result = assessAaveAccount({
      debtUsd8: BigInt(8000) * E8,
      collateralUsd8: BigInt(20000) * E8,
      thresholdBps: BigInt(8000),
      reportedHealthFactor: 2,
      legs: [
        {
          symbol: "WETH",
          amountRaw: BigInt(10) * E18,
          decimals: 18,
          priceUsd: 2000,
        },
      ],
    });
    expect(result.healthFactor).toBe(2);
    expect(result.liquidationPriceUsd).toBeCloseTo(1000, 2);
    expect(result.liquidationSymbol).toBe("ETH");
    expect(result.blended).toBe(false);
  });

  it("does not invent a price when the collateral has no price", () => {
    const result = assessAaveAccount({
      debtUsd8: BigInt(1000) * E8,
      collateralUsd8: BigInt(2000) * E8,
      thresholdBps: BigInt(8000),
      reportedHealthFactor: 1.6,
      legs: [{ symbol: "WBTC", amountRaw: BigInt(10) ** BigInt(8), decimals: 8, priceUsd: null }],
    });
    expect(result.healthFactor).toBe(1.6);
    expect(result.liquidationPriceUsd).toBeNull();
  });
});
