import type { AutoPortfolio, DetectedPosition, TokenHolding } from "@/types";
import { STABLE_SYMBOLS, positionLabel } from "./markets";

export type DefiKind = "supplied" | "borrowed" | "staked";

/** One non-zero on-chain balance, before it is merged into a portfolio. */
export type DefiReading = {
  chain: string;
  protocol: string;
  kind: DefiKind;
  symbol: string;
  /** Token to remove from plain holdings so the position is not counted twice. */
  receiptAddress: string;
  /** Address whose price should value this balance. The underlying for Aave and Compound. */
  priceAddress: string;
  amount: number;
  priceUsd?: number | null;
  healthFactor?: number | null;
  iconUrl?: string | null;
};

/** Ignores 1-wei leftovers. 1,000 raw units is dust on both 6- and 18-decimal tokens. */
export function isMeaningfulBalance(amountRaw: bigint): boolean {
  return amountRaw >= BigInt(1000);
}

function keyOf(chain: string, address: string): string {
  return `${chain}:${address.toLowerCase()}`;
}

function priceFromHoldings(tokens: TokenHolding[], reading: DefiReading): number | null {
  const underlying = tokens.find(
    (token) => token.chain === reading.chain && token.address.toLowerCase() === reading.priceAddress.toLowerCase(),
  );
  if (typeof underlying?.priceUsd === "number") return underlying.priceUsd;
  const symbol = reading.symbol.toUpperCase();
  if (STABLE_SYMBOLS.has(symbol)) return 1;
  if (symbol === "WETH" || symbol === "ETH") {
    const eth = tokens.find((token) => token.symbol.toUpperCase() === "ETH" || token.symbol.toUpperCase() === "WETH");
    if (typeof eth?.priceUsd === "number") return eth.priceUsd;
  }
  const receipt = tokens.find((token) => keyOf(token.chain, token.address) === keyOf(reading.chain, reading.receiptAddress));
  return typeof receipt?.priceUsd === "number" ? receipt.priceUsd : null;
}

function alreadyCovered(existing: DetectedPosition[], reading: DefiReading): boolean {
  const protocol = reading.protocol.toLowerCase();
  const shown = reading.symbol.toUpperCase() === "WETH" ? "ETH" : reading.symbol.toUpperCase();
  return existing.some((position) => {
    if (position.chain !== reading.chain) return false;
    const theirs = (position.protocol ?? "").toLowerCase();
    if (!theirs.includes(protocol.split(" ")[0] ?? protocol)) return false;
    const symbol = position.symbol.toUpperCase();
    if (symbol !== shown && symbol !== reading.symbol.toUpperCase() && !position.name.toUpperCase().includes(shown)) {
      return false;
    }
    const loan = position.kind === "loan" || position.kind === "borrowed";
    return reading.kind === "borrowed" ? loan : !loan;
  });
}

/**
 * Moves detected receipt tokens out of plain holdings and adds signed positions.
 * Borrows are negative. An indexer that already reported the same position is left as-is,
 * but its receipt token is still removed from the wallet list.
 */
export function applyDefiReadings(portfolio: AutoPortfolio, readings: DefiReading[]): AutoPortfolio {
  const active = readings.filter((reading) => reading.amount > 0 && Number.isFinite(reading.amount));
  const hide = new Set(active.map((reading) => keyOf(reading.chain, reading.receiptAddress)));
  const tokens = portfolio.tokens.filter((token) => !hide.has(keyOf(token.chain, token.address)));

  const added: DetectedPosition[] = [];
  for (const reading of active) {
    if (alreadyCovered(portfolio.positions, reading)) continue;
    const price = reading.priceUsd ?? priceFromHoldings(portfolio.tokens, reading);
    const magnitude = typeof price === "number" ? reading.amount * price : 0;
    // A priced leftover under a cent is noise. An unpriced balance stays so a real position is not hidden.
    if (typeof price === "number" && price > 0 && magnitude < 0.01) continue;
    const valueUsd = reading.kind === "borrowed" ? -magnitude : magnitude;
    added.push({
      id: `${reading.chain}:${reading.protocol}:${reading.kind}:${reading.receiptAddress.toLowerCase()}`,
      chain: reading.chain,
      protocol: reading.protocol,
      protocolIconUrl: reading.iconUrl ?? null,
      kind: reading.kind,
      symbol: reading.symbol.toUpperCase() === "WETH" ? "ETH" : reading.symbol,
      name: positionLabel(reading.protocol, reading.symbol, reading.kind),
      iconUrl: reading.iconUrl ?? null,
      groupId: null,
      valueUsd,
      amount: reading.amount,
      healthFactor: reading.healthFactor ?? null,
    });
  }

  const positions = [...portfolio.positions, ...added].sort((a, b) => b.valueUsd - a.valueUsd);
  const walletUsd = tokens.reduce((sum, token) => sum + token.valueUsd, 0);
  const defiUsd = positions.reduce((sum, position) => sum + position.valueUsd, 0);
  const chains = new Set<string>([...tokens.map((token) => token.chain), ...positions.map((position) => position.chain)]);

  return {
    ...portfolio,
    tokens,
    positions,
    walletUsd,
    defiUsd,
    totalUsd: walletUsd + defiUsd,
    chains: [...chains],
  };
}
