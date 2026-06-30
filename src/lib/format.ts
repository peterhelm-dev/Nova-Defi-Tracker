export function formatUsd(value: number, opts: { decimals?: number } = {}): string {
  const { decimals } = opts;
  if (!Number.isFinite(value)) return "$0.00";

  const fractionDigits = decimals ?? (Math.abs(value) >= 1000 ? 0 : 2);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: fractionDigits,
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

export function shortenAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}…${address.slice(-chars)}`;
}
