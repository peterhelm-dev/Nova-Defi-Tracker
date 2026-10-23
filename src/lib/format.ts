export function formatUsd(value: number, opts: { decimals?: number } = {}): string {
  const { decimals } = opts;
  if (!Number.isFinite(value)) return "$0.00";

  const abs = Math.abs(value);
  const fractionDigits = decimals ?? (abs >= 1000 ? 0 : abs > 0 && abs < 0.01 ? 4 : 2);
  const minimumFractionDigits = decimals ?? (abs > 0 && abs < 0.01 ? 2 : fractionDigits);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatTokenAmount(value: number, maxDecimals = 4): string {
  if (!Number.isFinite(value)) return "0";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: maxDecimals,
  }).format(value);
}

export function formatUpdatedAt(timestampMs: number): string {
  if (!timestampMs) return "—";
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(timestampMs);
}

const CHAIN_LABELS: Record<string, string> = {
  base: "Base",
  ethereum: "Ethereum",
  arbitrum: "Arbitrum",
  optimism: "Optimism",
  polygon: "Polygon",
  avalanche: "Avalanche",
  "binance-smart-chain": "BNB Chain",
  bsc: "BNB Chain",
  binance: "BNB Chain",
  xdai: "Gnosis",
  fantom: "Fantom",
  "zksync-era": "zkSync Era",
  linea: "Linea",
  scroll: "Scroll",
  blast: "Blast",
};

/** Human-readable label for a Zerion/DeFiLlama chain id, e.g. "base" -> "Base". */
export function formatChainName(chainId: string): string {
  if (!chainId) return "Unknown";
  const key = chainId.trim().toLowerCase();
  if (CHAIN_LABELS[key]) return CHAIN_LABELS[key];
  return chainId
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** Compact "12m ago" / "3h ago" / "5d ago" relative time for activity feeds. */
export function formatRelativeTime(isoOrMs: string | number): string {
  const then = typeof isoOrMs === "number" ? isoOrMs : new Date(isoOrMs).getTime();
  if (!Number.isFinite(then)) return "—";

  const diffMs = Date.now() - then;
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}d ago`;
}

export function shortenAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}…${address.slice(-chars)}`;
}
