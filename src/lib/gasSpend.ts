import type { GasSpendSummary } from "@/types";

export const GAS_WINDOW_DAYS = 30;
export const GAS_ACTIONS = ["transfer", "approval", "swap", "contract", "failed"] as const;
export type GasAction = (typeof GAS_ACTIONS)[number];

const APPROVE = new Set(["0x095ea7b3", "0x39509351", "0xa22cb465"]);
const TRANSFER = new Set(["0xa9059cbb", "0x23b872dd"]);
const SWAP = new Set([
  "0x38ed1739",
  "0x7ff36ab5",
  "0x18cbafe5",
  "0x8803dbee",
  "0x5c11d795",
  "0x4a25d94a",
  "0xfb3bdb41",
  "0x414bf389",
  "0xc04b8d59",
  "0x04e45aaf",
  "0xb858183f",
  "0x3593564c",
  "0x12aa3caf",
  "0x0502b1c5",
]);

export type GasSample = {
  chain: string;
  hash: string;
  from: string;
  status: "success" | "failed";
  gasUsed: bigint;
  effectiveGasPriceWei: bigint;
  /** OP-stack L1 data fee, in wei. Already paid on top of gasUsed * gas price. */
  l1FeeWei?: bigint;
  input: string;
  minedAt: string | null;
};

export function classifyGasAction(status: "success" | "failed", input: string): GasAction {
  if (status === "failed") return "failed";
  const selector = input.slice(0, 10).toLowerCase();
  if (APPROVE.has(selector)) return "approval";
  if (SWAP.has(selector)) return "swap";
  if (!input || input === "0x" || input.length <= 2 || TRANSFER.has(selector)) return "transfer";
  return "contract";
}

export function feeWei(sample: Pick<GasSample, "gasUsed" | "effectiveGasPriceWei" | "l1FeeWei">): bigint {
  return sample.gasUsed * sample.effectiveGasPriceWei + (sample.l1FeeWei ?? BigInt(0));
}

export function feeUsd(wei: bigint, nativeUsd: number | null): number | null {
  if (nativeUsd === null || !Number.isFinite(nativeUsd)) return null;
  return (Number(wei) / 1e18) * nativeUsd;
}

/**
 * Totals gas the wallet actually paid. Incoming transfers are ignored, the same
 * hash is counted once, and a reverted transaction still counts because the fee
 * was paid. Samples older than the window are left out when a timestamp exists.
 */
export function summarizeGasSpend(input: {
  wallet: string;
  samples: GasSample[];
  nativeUsd: Record<string, number | null>;
  windowDays?: number;
  now?: number;
  partial?: boolean;
}): GasSpendSummary {
  const wallet = input.wallet.toLowerCase();
  const windowDays = input.windowDays ?? GAS_WINDOW_DAYS;
  const now = input.now ?? Date.now();
  const cutoff = now - windowDays * 24 * 60 * 60 * 1000;
  const seen = new Set<string>();
  const byChain = new Map<string, { valueUsd: number; txCount: number }>();
  const byAction = new Map<GasAction, { valueUsd: number; txCount: number }>();
  let totalUsd = 0;
  let txCount = 0;
  let failedTxCount = 0;
  let oldestMinedAt: string | null = null;
  let partial = Boolean(input.partial);

  for (const sample of input.samples) {
    if (sample.from.toLowerCase() !== wallet) continue;
    const id = `${sample.chain}:${sample.hash.toLowerCase()}`;
    if (seen.has(id)) continue;
    if (sample.minedAt) {
      const mined = Date.parse(sample.minedAt);
      if (Number.isFinite(mined) && mined < cutoff) continue;
    }
    seen.add(id);
    const usd = feeUsd(feeWei(sample), input.nativeUsd[sample.chain] ?? null);
    if (usd === null) partial = true;
    const paid = usd ?? 0;
    const action = classifyGasAction(sample.status, sample.input);
    const chain = byChain.get(sample.chain) ?? { valueUsd: 0, txCount: 0 };
    chain.valueUsd += paid;
    chain.txCount += 1;
    byChain.set(sample.chain, chain);
    const bucket = byAction.get(action) ?? { valueUsd: 0, txCount: 0 };
    bucket.valueUsd += paid;
    bucket.txCount += 1;
    byAction.set(action, bucket);
    totalUsd += paid;
    txCount += 1;
    if (action === "failed") failedTxCount += 1;
    if (sample.minedAt && (!oldestMinedAt || sample.minedAt < oldestMinedAt)) oldestMinedAt = sample.minedAt;
  }

  return {
    totalUsd,
    txCount,
    byChain: [...byChain.entries()].map(([chain, row]) => ({ chain, valueUsd: row.valueUsd, txCount: row.txCount })),
    byAction: GAS_ACTIONS.filter((action) => byAction.has(action)).map((action) => ({
      action,
      valueUsd: byAction.get(action)?.valueUsd ?? 0,
      txCount: byAction.get(action)?.txCount ?? 0,
    })),
    failedTxCount,
    oldestMinedAt,
    windowDays,
    partial,
    updatedAt: now,
  };
}
