/** Plain-language true yield. Percents are the human form (5 means 5%). Not financial advice. */

export const YIELD_GAS_UNITS = {
  deposit: 250_000,
  claim: 180_000,
  withdraw: 300_000,
} as const;

const STABLES = new Set(["USDC", "USDT", "DAI", "USDBC", "USDS", "GHO", "LUSD", "FRAX", "PYUSD", "CRVUSD", "USDE", "USD0"]);

export function poolHasImpermanentLoss(symbol: string): boolean {
  const parts = symbol
    .toUpperCase()
    .split(/[-/]/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length < 2) return false;
  return parts.some((part) => !STABLES.has(part));
}

/** Fraction of a 50/50 position lost when one price moves by `priceRatio` (1 = unchanged). */
export function impermanentLoss(priceRatio: number): number {
  if (!Number.isFinite(priceRatio) || priceRatio <= 0) return 0;
  const kept = (2 * Math.sqrt(priceRatio)) / (1 + priceRatio);
  return Math.max(0, 1 - kept);
}

export function claimCount(days: number, rewardApyPct: number | null): number {
  if (!rewardApyPct || rewardApyPct <= 0 || days < 30) return 0;
  return Math.floor(days / 30);
}

export function gasCostUsd(gasPriceWei: bigint, gasUnits: number, nativeUsd: number | null): number | null {
  if (nativeUsd === null || !Number.isFinite(nativeUsd) || gasPriceWei < BigInt(0)) return null;
  const wei = gasPriceWei * BigInt(Math.max(0, Math.round(gasUnits)));
  return (Number(wei) / 1e18) * nativeUsd;
}

export type TrueYieldInput = {
  depositUsd: number;
  days: number;
  baseApyPct: number | null;
  rewardApyPct: number | null;
  /** 0–100. A 50 haircut keeps half of the reward APY. */
  rewardHaircutPct: number;
  /** Fraction of the deposit lost to impermanent loss over the hold, 0–1. */
  ilFraction: number;
  feeAprPct: number | null;
  gasUsd: number;
};

export type TrueYieldResult = {
  grossUsd: number;
  rewardUsd: number;
  ilUsd: number;
  feeUsd: number;
  gasUsd: number;
  netUsd: number;
  netApyPct: number | null;
  /** Smallest deposit that covers gas and the other drags. Null when the yield itself is not positive. */
  breakEvenDepositUsd: number | null;
};

export function trueYield(input: TrueYieldInput): TrueYieldResult {
  const deposit = Math.max(0, input.depositUsd);
  const days = Math.max(0, input.days);
  const year = days / 365;
  const base = Math.max(0, input.baseApyPct ?? 0) / 100;
  const haircut = Math.min(100, Math.max(0, input.rewardHaircutPct)) / 100;
  const rewardRate = Math.max(0, input.rewardApyPct ?? 0) / 100 * (1 - haircut);
  const fee = Math.max(0, input.feeAprPct ?? 0) / 100;
  const il = Math.min(1, Math.max(0, input.ilFraction));
  const gasUsd = Math.max(0, input.gasUsd);
  const grossUsd = deposit * base * year;
  const rewardUsd = deposit * rewardRate * year;
  const feeUsd = deposit * fee * year;
  const ilUsd = deposit * il;
  const netUsd = grossUsd + rewardUsd - feeUsd - ilUsd - gasUsd;
  const netApyPct = deposit > 0 && days > 0 ? (netUsd / deposit) * (365 / days) * 100 : null;
  const yieldFraction = (base + rewardRate - fee) * year - il;
  const breakEvenDepositUsd = yieldFraction > 0 ? gasUsd / yieldFraction : null;
  return { grossUsd, rewardUsd, ilUsd, feeUsd, gasUsd, netUsd, netApyPct, breakEvenDepositUsd };
}

export function actionGasUnits(days: number, rewardApyPct: number | null): number {
  return YIELD_GAS_UNITS.deposit + YIELD_GAS_UNITS.withdraw + claimCount(days, rewardApyPct) * YIELD_GAS_UNITS.claim;
}
