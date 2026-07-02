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

/**
 * A non-wallet (DeFi) position auto-detected by a portfolio indexer — an LP,
 * vault, staked, lending, or reward position the manual "Track" flow can't see.
 */
export type DetectedPosition = {
  id: string;
  chain: string;
  protocol: string | null;
  /** e.g. "deposit" | "staked" | "reward" | "loan". */
  kind: string;
  symbol: string;
  name: string;
  valueUsd: number;
};

/**
 * A wallet's complete holdings across chains, detected automatically (Phase 2,
 * "Pro"). Tokens map to the same shape the curated free flow produces so the
 * dashboard renders them identically; positions are the DeFi slice.
 */
export type AutoPortfolio = {
  address: string;
  tokens: TokenHolding[];
  positions: DetectedPosition[];
  walletUsd: number;
  defiUsd: number;
  totalUsd: number;
  chains: string[];
  provider: string;
  updatedAt: number;
};

export type SubscriptionStatus =
  | "none"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled";

/** A wallet's billing state, mirrored from Stripe by the webhook. */
export type Subscription = {
  plan: "free" | "pro";
  status: SubscriptionStatus;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  /** Unix seconds; when the current paid period ends. */
  currentPeriodEnd?: number;
  /** Whether Stripe has flagged this subscription to cancel at period end. */
  cancelAtPeriodEnd?: boolean;
  updatedAt: number;
};
