/**
 * Official chain marks, self-hosted so a flaky CDN can't turn them into empty
 * circles. Base uses Base's own square logomark (not the Coinbase "C").
 * Sources: Trust Wallet's chain registry, which redistributes the projects'
 * official icons.
 */
const LOCAL_CHAIN_ICONS: Record<string, string> = {
  ethereum: "/chains/ethereum.png",
  base: "/chains/base.png",
  arbitrum: "/chains/arbitrum.png",
  optimism: "/chains/optimism.png",
  polygon: "/chains/polygon.png",
  "binance-smart-chain": "/chains/bnb.png",
  avalanche: "/chains/avalanche.png",
};

/** Map UI ids and DeFiLlama labels onto the ids this app stores. */
export function normalizeChainId(chainId: string): string {
  const key = chainId.trim().toLowerCase();
  if (key === "eth" || key === "mainnet") return "ethereum";
  if (
    key === "bsc" ||
    key === "bnb" ||
    key === "binance" ||
    key === "bnb chain" ||
    key === "binance smart chain"
  ) {
    return "binance-smart-chain";
  }
  if (key === "avax" || key === "avalanche c-chain") return "avalanche";
  if (key === "arb" || key === "arbitrum one") return "arbitrum";
  if (key === "op" || key === "optimism mainnet") return "optimism";
  if (key === "matic") return "polygon";
  return key;
}

export function chainIconUrl(chainId: string): string {
  return LOCAL_CHAIN_ICONS[normalizeChainId(chainId)] ?? "";
}

/** DeFiLlama's protocol icon CDN. `project` is the yields slug or a display name. */
export function protocolIconUrl(project: string): string {
  const slug = project
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `https://icons.llamao.fi/icons/protocols/${slug}?w=48&h=48`;
}
