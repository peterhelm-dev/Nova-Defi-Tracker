export type TokenHolding = {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  balance: number;
  priceUsd: number | null;
  change24h: number | null;
  valueUsd: number;
};

export type DefiPool = {
  id: string;
  project: string;
  symbol: string;
  chain: string;
  tvlUsd: number;
  apy: number | null;
  apyBase: number | null;
  apyReward: number | null;
};

export type TrackedPosition = {
  id: string;
  poolId: string;
  project: string;
  symbol: string;
  amountUsd: number;
  apyAtEntry: number | null;
  addedAt: number;
};

export type NetWorthSnapshot = {
  date: string;
  walletUsd: number;
  defiUsd: number;
  totalUsd: number;
};

export type PriceResponse = {
  tokens: Record<string, { usd?: number; usd_24h_change?: number }>;
  eth?: { usd?: number; usd_24h_change?: number };
};
