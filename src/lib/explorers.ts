const EXPLORER_ORIGIN: Record<string, string> = {
  base: "https://basescan.org",
  ethereum: "https://etherscan.io",
  arbitrum: "https://arbiscan.io",
  optimism: "https://optimistic.etherscan.io",
  polygon: "https://polygonscan.com",
  avalanche: "https://snowtrace.io",
  "binance-smart-chain": "https://bscscan.com",
};

/** Block-explorer link for a transaction hash, when the chain is a known one. */
export function explorerTxUrl(chain: string, hash: string): string | null {
  const origin = EXPLORER_ORIGIN[chain];
  return origin ? `${origin}/tx/${hash}` : null;
}

/** The address is the same on each EVM chain. Ethereum's explorer is the default. */
export function explorerAddressUrl(address: string): string {
  return `${EXPLORER_ORIGIN.ethereum}/address/${address}`;
}
