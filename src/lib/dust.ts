import type { TokenHolding } from "@/types";

export const NATIVE_TRANSFER_GAS = 21_000;
export const TOKEN_TRANSFER_GAS = 65_000;

export type ChainCost = {
  chain: string;
  nativeSymbol: string;
  gasPriceWei: string;
  nativeUsd: number | null;
};

export type DustRow = {
  symbol: string;
  chain: string;
  valueUsd: number;
  moveCostUsd: number;
};

export type IdleGasRow = {
  chain: string;
  symbol: string;
  valueUsd: number;
};

export type DustReport = {
  trapped: DustRow[];
  idle: IdleGasRow[];
  stranded: DustRow[];
};

function isNative(address: string): boolean {
  return address === "native" || address === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
}

export function moveCostUsd(gasUnits: number, cost: ChainCost | undefined): number | null {
  if (!cost || cost.nativeUsd === null) return null;
  try {
    const wei = BigInt(cost.gasPriceWei) * BigInt(gasUnits);
    return (Number(wei) / 1e18) * cost.nativeUsd;
  } catch {
    return null;
  }
}

/**
 * Tokens worth less than the gas to transfer them, native gas sitting on each
 * chain, and tokens on a chain where the native balance cannot pay that transfer.
 */
export function dustReport(holdings: TokenHolding[], costs: ChainCost[]): DustReport {
  const byChain = new Map(costs.map((cost) => [cost.chain, cost]));
  const nativeByChain = new Map<string, TokenHolding>();
  for (const holding of holdings) {
    if (isNative(holding.address)) nativeByChain.set(holding.chain, holding);
  }

  const trapped: DustRow[] = [];
  const stranded: DustRow[] = [];
  const seenChains = new Set<string>();

  for (const holding of holdings) {
    seenChains.add(holding.chain);
    const cost = byChain.get(holding.chain);
    if (isNative(holding.address)) {
      const nativeMove = moveCostUsd(NATIVE_TRANSFER_GAS, cost);
      if (nativeMove !== null && holding.valueUsd > 0 && holding.valueUsd < nativeMove) {
        trapped.push({
          symbol: holding.symbol,
          chain: holding.chain,
          valueUsd: holding.valueUsd,
          moveCostUsd: nativeMove,
        });
      }
      continue;
    }
    const move = moveCostUsd(TOKEN_TRANSFER_GAS, cost);
    if (move === null) continue;
    const row = { symbol: holding.symbol, chain: holding.chain, valueUsd: holding.valueUsd, moveCostUsd: move };
    if (holding.valueUsd < move) trapped.push(row);
    const native = nativeByChain.get(holding.chain);
    const nativeValue = native?.valueUsd ?? 0;
    if (nativeValue < move) stranded.push(row);
  }

  const idle: IdleGasRow[] = [];
  for (const chain of seenChains) {
    const native = nativeByChain.get(chain);
    const cost = byChain.get(chain);
    idle.push({
      chain,
      symbol: native?.symbol ?? cost?.nativeSymbol ?? "gas",
      valueUsd: native?.valueUsd ?? 0,
    });
  }

  trapped.sort((a, b) => a.valueUsd - b.valueUsd);
  stranded.sort((a, b) => b.valueUsd - a.valueUsd);
  idle.sort((a, b) => b.valueUsd - a.valueUsd);
  return { trapped, idle, stranded };
}
