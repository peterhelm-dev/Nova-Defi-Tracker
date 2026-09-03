export type TokenHolding = {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  /** Chain id the balance lives on, e.g. "base" | "ethereum". */
  chain: string;
  /** Coin logo URL, when known. */
  iconUrl: string | null;
  /** Indexer-assigned cross-chain token id (e.g. "eth", or a contract address) — used to query per-token PnL and price history. Null when unavailable (free/curated flow). */
  fungibleId: string | null;
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
  /** Human-readable protocol/app name, e.g. "Aave V3". Falls back to the raw id when unavailable. */
  protocol: string | null;
  /** Protocol/app logo URL, when known. */
  protocolIconUrl: string | null;
  /** e.g. "deposit" | "staked" | "reward" | "loan". */
  kind: string;
  symbol: string;
  name: string;
  /** Underlying coin's logo URL, when known. */
  iconUrl: string | null;
  /** Groups legs of one multi-token position (e.g. both sides of a liquidity pool) — same id across the group. Null when the position stands alone. */
  groupId: string | null;
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

/** Realized/unrealized profit & loss for a wallet, computed by the indexer. */
export type WalletPnl = {
  totalGainUsd: number;
  realizedGainUsd: number;
  unrealizedGainUsd: number;
  totalGainPct: number | null;
  realizedGainPct: number | null;
  unrealizedGainPct: number | null;
  totalInvestedUsd: number;
  netInvestedUsd: number;
  updatedAt: number;
};

/** Realized/unrealized profit & loss for one specific token in the wallet. */
export type TokenPnl = {
  fungibleId: string;
  averageBuyPriceUsd: number | null;
  averageSellPriceUsd: number | null;
  totalGainUsd: number;
  realizedGainUsd: number;
  unrealizedGainUsd: number;
  totalGainPct: number | null;
  realizedGainPct: number | null;
  unrealizedGainPct: number | null;
  totalInvestedUsd: number;
};

/** One point in a token's price history, for a price chart. */
export type PricePoint = { t: number; priceUsd: number };

/** Gas fees paid, summed over the most recent page of transactions. */
export type GasSpendSummary = {
  totalUsd: number;
  txCount: number;
  byChain: { chain: string; valueUsd: number }[];
  /** Oldest transaction's mined_at in the sample — the window this summary actually covers. */
  oldestMinedAt: string | null;
  updatedAt: number;
};

export type ActivityTransfer = {
  direction: "in" | "out";
  symbol: string;
  quantity: number;
  valueUsd: number | null;
};

/** One onchain transaction, for the Recent Activity feed. */
export type ActivityItem = {
  id: string;
  type: string;
  status: "confirmed" | "pending" | "failed" | string;
  occurredAt: string;
  hash: string;
  chain: string;
  explorerUrl: string | null;
  transfers: ActivityTransfer[];
};

export type AlertDirection = "above" | "below";

/** A user-defined price alert on a token the app tracks. */
export type AlertRule = {
  id: string;
  symbol: string;
  /** Token contract address, or "native" for ETH. */
  tokenAddress: string;
  direction: AlertDirection;
  thresholdUsd: number;
  /**
   * Fires only while armed; disarms on firing and re-arms once the price
   * crosses back, so a rule alerts once per crossing instead of every hour.
   */
  armed: boolean;
  createdAt: number;
};

/** A fired alert, kept until the user dismisses it. */
export type AlertEvent = {
  id: string;
  ruleId: string;
  symbol: string;
  direction: AlertDirection;
  thresholdUsd: number;
  priceUsd: number;
  triggeredAt: number;
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
