import { formatChainName, formatUsd, shortenAddress } from "@/lib/format";

/** Shown once beside the figures. Not an instruction to change the loan. */
export const HEALTH_FACTOR_GLOSS =
  "Health factor is how far a loan is from liquidation. Above 1, the protocol has not reached the point where it can sell collateral.";

export type LoanLine = {
  walletAddress?: string | null;
  protocol: string;
  chain: string;
  market: string | null;
  healthFactor: number;
  liquidationPriceUsd: number | null;
  liquidationSymbol: string | null;
  blended: boolean;
  covered: boolean;
};

type PositionLike = {
  walletAddress?: string | null;
  protocol?: string | null;
  chain: string;
  healthFactor?: number | null;
  liquidationPriceUsd?: number | null;
  liquidationSymbol?: string | null;
  liquidationMarket?: string | null;
  liquidationBlended?: boolean | null;
  liquidationCovered?: boolean | null;
};

const LENDING = new Set(["aave", "compound"]);

export function formatThreshold(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return String(rounded);
}

export function loanLinesFromPositions(positions: PositionLike[]): LoanLine[] {
  const seen = new Set<string>();
  const lines: LoanLine[] = [];
  for (const position of positions) {
    const protocol = position.protocol ?? "";
    if (!LENDING.has(protocol.toLowerCase())) continue;
    const health = position.healthFactor;
    if (typeof health !== "number" || !Number.isFinite(health) || health >= 1_000_000) continue;
    const line: LoanLine = {
      walletAddress: position.walletAddress ?? null,
      protocol,
      chain: position.chain,
      market: position.liquidationMarket ?? null,
      healthFactor: health,
      liquidationPriceUsd: typeof position.liquidationPriceUsd === "number" ? position.liquidationPriceUsd : null,
      liquidationSymbol: position.liquidationSymbol ?? null,
      blended: Boolean(position.liquidationBlended),
      covered: Boolean(position.liquidationCovered),
    };
    const key = [
      line.walletAddress ?? "",
      line.protocol,
      line.chain,
      line.market ?? "",
      line.healthFactor.toFixed(4),
      line.liquidationSymbol ?? "",
    ].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push(line);
  }
  return lines;
}

export function protocolPlace(line: Pick<LoanLine, "protocol" | "market" | "chain">): string {
  const name = line.market ? `${line.protocol} ${line.market}` : line.protocol;
  return `${name} on ${formatChainName(line.chain)}`;
}

/** One plain sentence for the portfolio. No instruction to add collateral or repay. */
export function loanDetailSentence(line: LoanLine, showWallet: boolean): string {
  const wallet = showWallet && line.walletAddress ? ` for ${shortenAddress(line.walletAddress)}` : "";
  const parts = [`${protocolPlace(line)}${wallet}: health factor ${line.healthFactor.toFixed(2)}.`];
  if (line.healthFactor <= 1) {
    parts.push("This reading is at or under 1, the protocol's liquidation line.");
  }
  if (typeof line.liquidationPriceUsd === "number" && line.liquidationSymbol) {
    parts.push(
      `Liquidation price for ${line.liquidationSymbol}, the largest collateral, is about ${formatUsd(line.liquidationPriceUsd)}.`,
    );
    if (line.blended) {
      parts.push("That price uses a blended threshold and keeps other collateral prices unchanged, so it is an estimate.");
    }
  } else if (line.covered && line.liquidationSymbol) {
    parts.push(
      `Other collateral already covers this loan at the current threshold, so ${line.liquidationSymbol} has no single liquidation price.`,
    );
  } else {
    parts.push("A liquidation price for the largest collateral is not available from this read.");
  }
  return parts.join(" ");
}

/** The sentence used in alert mail. Informational, never a recommendation. */
export function healthAlertSentence(input: {
  protocol: string;
  market: string | null;
  chain: string;
  healthFactor: number;
  threshold: number;
}): string {
  const name = input.market ? `${input.protocol} ${input.market}` : input.protocol;
  const health = input.healthFactor.toFixed(2);
  return `Your ${name} health factor on ${formatChainName(input.chain)} is ${health}, below your ${formatThreshold(input.threshold)} alert.`;
}
