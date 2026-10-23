/** Compare a catalog entry with what the chain returned. Null means it matches. */
export function identityMismatch(
  expected: { symbol: string; decimals: number },
  actual: { symbol: string | null; decimals: number | null },
): string | null {
  if (actual.decimals === null) return "decimals() did not return";
  if (actual.decimals !== expected.decimals) return `decimals ${actual.decimals}, catalog says ${expected.decimals}`;
  if (!actual.symbol) return "symbol() did not return";
  if (normalizeSymbol(actual.symbol) !== normalizeSymbol(expected.symbol)) {
    return `symbol ${actual.symbol}, catalog says ${expected.symbol}`;
  }
  return null;
}

export function sameAddress(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase();
}

export function normalizeSymbol(value: string): string {
  return value.replace(/\0/g, "").trim().toLowerCase();
}

/** Mainnet USDT's symbol() is bytes32, not a string. */
export function bytes32Symbol(value: `0x${string}`): string {
  const hex = value.slice(2);
  let text = "";
  for (let i = 0; i < hex.length; i += 2) {
    const code = Number.parseInt(hex.slice(i, i + 2), 16);
    if (code === 0) break;
    text += String.fromCharCode(code);
  }
  return text;
}
