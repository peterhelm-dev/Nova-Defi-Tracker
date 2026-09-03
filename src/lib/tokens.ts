import type { Address } from "viem";

export type BaseToken = {
  symbol: string;
  name: string;
  address: Address;
  decimals: number;
  iconUrl: string;
};

/** Trust Wallet's public asset CDN — no key required, stable per-chain/address URL pattern. */
function trustWalletIcon(chain: "ethereum" | "base", address: string): string {
  return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${chain}/assets/${address}/logo.png`;
}

type BaseTokenSeed = Omit<BaseToken, "iconUrl">;

/**
 * Curated list of well-known ERC-20s on Base mainnet, balance-checked via
 * multicall and priced via CoinGecko's `base` platform endpoint. Verify any
 * address you add here against basescan.org before trusting it with real
 * balances.
 */
const BASE_TOKEN_SEEDS: BaseTokenSeed[] = [
  {
    symbol: "WETH",
    name: "Wrapped Ether",
    address: "0x4200000000000000000000000000000000000006",
    decimals: 18,
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    decimals: 6,
  },
  {
    symbol: "USDbC",
    name: "Bridged USDC",
    address: "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA",
    decimals: 6,
  },
  {
    symbol: "DAI",
    name: "Dai Stablecoin",
    address: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
    decimals: 18,
  },
  {
    symbol: "cbETH",
    name: "Coinbase Wrapped Staked ETH",
    address: "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22",
    decimals: 18,
  },
  {
    symbol: "cbBTC",
    name: "Coinbase Wrapped BTC",
    address: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf",
    decimals: 8,
  },
  {
    symbol: "AERO",
    name: "Aerodrome Finance",
    address: "0x940181a94A35A4569E4529A3CDfB74e38FD98631",
    decimals: 18,
  },
  {
    symbol: "DEGEN",
    name: "Degen",
    address: "0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed",
    decimals: 18,
  },
  {
    symbol: "BRETT",
    name: "Brett",
    address: "0x532f27101965dd16442E59d40670FaF5eBB142E4",
    decimals: 18,
  },
];

export const BASE_TOKENS: BaseToken[] = BASE_TOKEN_SEEDS.map((token) => ({
  ...token,
  iconUrl: trustWalletIcon("base", token.address),
}));

/** Native ETH's icon — reuses the well-known mainnet WETH logo Trust Wallet hosts. */
export const ETH_ICON_URL = trustWalletIcon(
  "ethereum",
  "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
);
