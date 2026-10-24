/**
 * Liquidation math for one lending account.
 *
 * USD notionals use 8 decimal places (1e8 = $1), matching Aave's base currency
 * and Compound III's price scale. Token amounts stay in raw units until the
 * price is converted for display. Factors use 1e18 = 100%.
 */

const USD = BigInt(10) ** BigInt(8);
const FACTOR = BigInt(10) ** BigInt(18);
const ONE_CENT = BigInt(10) ** BigInt(6);

export type CollateralLeg = {
  symbol: string;
  /** Collateral value in 8-decimal USD. */
  usd8: bigint;
  amountRaw: bigint;
  /** Whole-token scale, usually 10^decimals. */
  scale: bigint;
  /** Share of this collateral that counts toward liquidation. 1e18 = 100%. */
  factor1e18: bigint;
};

export type LoanAssessment = {
  healthFactor: number | null;
  liquidationPriceUsd: number | null;
  liquidationSymbol: string | null;
  blended: boolean;
  coveredByOtherCollateral: boolean;
};

export function priceToUsd8(priceUsd: number): bigint {
  if (!Number.isFinite(priceUsd) || priceUsd <= 0) return BigInt(0);
  const [whole, frac = ""] = priceUsd.toFixed(8).split(".");
  const digits = `${whole}${frac.padEnd(8, "0").slice(0, 8)}`.replace(/^\+/, "");
  if (!/^\d+$/.test(digits)) return BigInt(0);
  return BigInt(digits);
}

export function usd8FromAmount(amountRaw: bigint, scale: bigint, priceUsd: number): bigint {
  if (amountRaw <= BigInt(0) || scale <= BigInt(0)) return BigInt(0);
  const price = priceToUsd8(priceUsd);
  if (price === BigInt(0)) return BigInt(0);
  return (amountRaw * price) / scale;
}

export function scaleFromDecimals(decimals: number): bigint {
  const places = Number.isInteger(decimals) && decimals >= 0 && decimals <= 36 ? decimals : 18;
  return BigInt(10) ** BigInt(places);
}

/** Aave's account liquidation threshold is 4-decimal (10000 = 100%). */
export function aaveFactor(thresholdBps: bigint): bigint {
  if (thresholdBps <= BigInt(0)) return BigInt(0);
  return thresholdBps * FACTOR / BigInt(10000);
}

function weighted(leg: CollateralLeg): bigint {
  if (leg.factor1e18 <= BigInt(0) || leg.usd8 <= BigInt(0)) return BigInt(0);
  return (leg.usd8 * leg.factor1e18) / FACTOR;
}

function healthFromWeighted(totalWeighted: bigint, debtUsd8: bigint): number | null {
  if (debtUsd8 <= BigInt(0) || totalWeighted <= BigInt(0)) return debtUsd8 > BigInt(0) ? 0 : null;
  const scaled = (totalWeighted * FACTOR) / debtUsd8;
  const health = Number(scaled) / 1e18;
  if (!Number.isFinite(health)) return null;
  return health;
}

function priceFromDeficit(leg: CollateralLeg, deficitUsd8: bigint): number | null {
  if (deficitUsd8 <= BigInt(0)) return null;
  if (leg.amountRaw <= BigInt(0) || leg.scale <= BigInt(0) || leg.factor1e18 <= BigInt(0)) return null;
  const priceUsd8 = (deficitUsd8 * FACTOR * leg.scale) / (leg.amountRaw * leg.factor1e18);
  if (priceUsd8 <= BigInt(0)) return null;
  const price = Number(priceUsd8) / Number(USD);
  return Number.isFinite(price) && price > 0 ? price : null;
}

/**
 * Health factor is weighted collateral divided by debt.
 * The liquidation price is the main collateral's price at which that ratio
 * would be 1, holding every other collateral price where it is.
 * No debt means there is no health factor and no liquidation price.
 */
export function assessLoan(debtUsd8: bigint, legs: CollateralLeg[]): LoanAssessment {
  const empty: LoanAssessment = {
    healthFactor: null,
    liquidationPriceUsd: null,
    liquidationSymbol: null,
    blended: false,
    coveredByOtherCollateral: false,
  };
  if (debtUsd8 <= BigInt(0)) return empty;

  const usable = legs.filter((leg) => leg.usd8 > ONE_CENT && leg.amountRaw > BigInt(0));
  const totalWeighted = usable.reduce((sum, leg) => sum + weighted(leg), BigInt(0));
  const healthFactor = healthFromWeighted(totalWeighted, debtUsd8);
  const main = usable.reduce<CollateralLeg | null>((best, leg) => {
    if (!best || leg.usd8 > best.usd8) return leg;
    return best;
  }, null);
  if (!main) {
    return { ...empty, healthFactor: healthFactor ?? 0 };
  }

  const blended = usable.length > 1;
  const otherWeighted = totalWeighted - weighted(main);
  if (otherWeighted >= debtUsd8 || main.factor1e18 <= BigInt(0)) {
    return {
      healthFactor,
      liquidationPriceUsd: null,
      liquidationSymbol: displaySymbol(main.symbol),
      blended,
      coveredByOtherCollateral: otherWeighted >= debtUsd8,
    };
  }

  return {
    healthFactor,
    liquidationPriceUsd: priceFromDeficit(main, debtUsd8 - otherWeighted),
    liquidationSymbol: displaySymbol(main.symbol),
    blended,
    coveredByOtherCollateral: false,
  };
}

export function displaySymbol(symbol: string): string {
  const cleaned = symbol.replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 32);
  const shown = cleaned.length > 0 ? cleaned : "collateral";
  return shown.toUpperCase() === "WETH" ? "ETH" : shown;
}

export type AaveLegInput = {
  symbol: string;
  amountRaw: bigint;
  decimals: number;
  priceUsd: number | null;
};

/**
 * Uses the pool's own debt, collateral, and blended threshold.
 * Per-asset prices come from the balances we already read.
 * The contract health factor wins when it was returned; otherwise the ratio
 * of the pool's collateral and debt is used.
 */
export function assessAaveAccount(input: {
  debtUsd8: bigint;
  collateralUsd8: bigint;
  thresholdBps: bigint;
  reportedHealthFactor: number | null;
  legs: AaveLegInput[];
}): LoanAssessment {
  const factor = aaveFactor(input.thresholdBps);
  const legs: CollateralLeg[] = input.legs
    .filter((leg) => typeof leg.priceUsd === "number" && leg.priceUsd > 0 && leg.amountRaw > BigInt(0))
    .map((leg) => {
      const scale = scaleFromDecimals(leg.decimals);
      return {
        symbol: leg.symbol,
        amountRaw: leg.amountRaw,
        scale,
        factor1e18: factor,
        usd8: usd8FromAmount(leg.amountRaw, scale, leg.priceUsd ?? 0),
      };
    });
  const assessed = assessLoan(input.debtUsd8, legs);
  const reported = input.reportedHealthFactor;
  const healthFactor = typeof reported === "number" && Number.isFinite(reported) ? reported : assessed.healthFactor;
  const protocolWeighted = factor > BigInt(0) ? (input.collateralUsd8 * factor) / FACTOR : BigInt(0);
  const main = legs.reduce<CollateralLeg | null>((best, leg) => (!best || leg.usd8 > best.usd8 ? leg : best), null);
  const blended = assessed.blended || (main !== null && protocolWeighted > weighted(main) * BigInt(105) / BigInt(100));
  if (input.debtUsd8 <= BigInt(0)) {
    return { ...assessed, healthFactor: null, blended: false };
  }
  return { ...assessed, healthFactor, blended };
}
