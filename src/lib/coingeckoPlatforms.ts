/** Zerion/internal chain id -> CoinGecko asset platform id, for contract-based price history. */
const PLATFORM_BY_CHAIN: Record<string, string> = {
  base: "base",
  ethereum: "ethereum",
  arbitrum: "arbitrum-one",
  optimism: "optimistic-ethereum",
  polygon: "polygon-pos",
  avalanche: "avalanche",
  "binance-smart-chain": "binance-smart-chain",
  linea: "linea",
  scroll: "scroll",
  blast: "blast",
  "zksync-era": "zksync",
};

export function coingeckoPlatform(chain: string): string | null {
  return PLATFORM_BY_CHAIN[chain] ?? null;
}

/** Native-asset CoinGecko coin id per chain, for tokens with no contract address. */
const NATIVE_COIN_BY_CHAIN: Record<string, string> = {
  base: "ethereum",
  ethereum: "ethereum",
  arbitrum: "ethereum",
  optimism: "ethereum",
  blast: "ethereum",
  linea: "ethereum",
  scroll: "ethereum",
  "zksync-era": "ethereum",
  polygon: "matic-network",
  avalanche: "avalanche-2",
  "binance-smart-chain": "binancecoin",
};

export function nativeCoinId(chain: string): string | null {
  return NATIVE_COIN_BY_CHAIN[chain] ?? null;
}
