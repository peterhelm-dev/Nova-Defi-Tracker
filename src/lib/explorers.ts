const EXPLORER_BASE: Record<string, string> = {
  base: "https://basescan.org/tx/",
  ethereum: "https://etherscan.io/tx/",
  arbitrum: "https://arbiscan.io/tx/",
  optimism: "https://optimistic.etherscan.io/tx/",
  polygon: "https://polygonscan.com/tx/",
  avalanche: "https://snowtrace.io/tx/",
  "binance-smart-chain": "https://bscscan.com/tx/",
};

/** Block-explorer link for a transaction hash, when the chain is a known one. */
export function explorerTxUrl(chain: string, hash: string): string | null {
  const base = EXPLORER_BASE[chain];
  return base ? `${base}${hash}` : null;
}
