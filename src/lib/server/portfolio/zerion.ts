import type {
  ActivityItem,
  AutoPortfolio,
  DetectedPosition,
  GasSpendSummary,
  TokenHolding,
  TokenPnl,
  WalletPnl,
} from "@/types";
import { explorerTxUrl } from "@/lib/explorers";
import type { PortfolioProvider } from "./provider";

/**
 * Zerion adapter. Zerion's Wallet Positions API returns fungible token balances
 * and DeFi positions (deposits, staked, rewards, loans) across every supported
 * chain, each already priced in USD — exactly the auto-detection the free
 * Base-only flow can't provide.
 *
 * Auth is HTTP Basic with the API key as the username and an empty password.
 *
 * NOTE: the response mapping (`mapZerionPositions`) is a pure function so it can
 * be unit-tested against fixtures. It targets Zerion's documented v1 schema;
 * verify against a live key when wiring a real ZERION_API_KEY.
 */

const ZERION_BASE = "https://api.zerion.io/v1";

// Minimal shape of the fields we read from a Zerion position resource.
type ZerionPosition = {
  id?: string;
  attributes?: {
    name?: string;
    value?: number | null;
    price?: number | null;
    quantity?: { float?: number | null } | null;
    position_type?: string;
    fungible_info?: {
      id?: string;
      name?: string;
      symbol?: string;
      icon?: { url?: string | null } | null;
      implementations?: { address?: string | null; decimals?: number | null }[];
    } | null;
    changes?: { percent_1d?: number | null } | null;
    flags?: { displayable?: boolean } | null;
    application_metadata?: { name?: string | null; icon?: { url?: string | null } | null } | null;
    /** Groups legs of one multi-token position (e.g. both sides of a liquidity pool). */
    group_id?: string | null;
  };
  relationships?: {
    chain?: { data?: { id?: string } };
    dapp?: { data?: { id?: string } } | null;
  };
};

export type ZerionPositionsResponse = { data?: ZerionPosition[] };

// Minimal shape of the fields we read from a Zerion transaction resource.
type ZerionTransaction = {
  id?: string;
  attributes?: {
    operation_type?: string;
    status?: string;
    mined_at?: string | null;
    hash?: string;
    fee?: { value?: number | null } | null;
    transfers?: {
      direction?: "in" | "out" | string;
      quantity?: { float?: number | null } | null;
      value?: number | null;
      fungible_info?: { symbol?: string } | null;
    }[];
  };
  relationships?: { chain?: { data?: { id?: string } } };
};

/** Pure transform from a Zerion positions payload to our AutoPortfolio. */
export function mapZerionPositions(
  address: string,
  payload: ZerionPositionsResponse,
): AutoPortfolio {
  const tokens: TokenHolding[] = [];
  const positions: DetectedPosition[] = [];
  const chains = new Set<string>();
  let walletUsd = 0;
  let defiUsd = 0;

  for (const [index, item] of (payload.data ?? []).entries()) {
    const attr = item.attributes ?? {};
    if (attr.flags?.displayable === false) continue;

    const value = typeof attr.value === "number" ? attr.value : 0;
    if (value <= 0) continue;

    const chain = item.relationships?.chain?.data?.id ?? "unknown";
    chains.add(chain);
    const info = attr.fungible_info ?? {};
    const symbol = info.symbol ?? "?";
    const name = info.name ?? symbol;
    const kind = attr.position_type ?? "wallet";

    if (kind === "wallet") {
      const impl = info.implementations?.[0];
      tokens.push({
        symbol,
        name,
        address: impl?.address ?? "native",
        decimals: impl?.decimals ?? 18,
        chain,
        iconUrl: info.icon?.url ?? null,
        fungibleId: info.id ?? null,
        balance: attr.quantity?.float ?? 0,
        priceUsd: typeof attr.price === "number" ? attr.price : null,
        change24h:
          typeof attr.changes?.percent_1d === "number"
            ? attr.changes.percent_1d
            : null,
        valueUsd: value,
      });
      walletUsd += value;
    } else {
      // Zerion reports a "loan" position's value as a positive magnitude (the
      // size of the debt), not a signed liability — flip it here so borrowed
      // funds subtract from net worth instead of counting as an asset.
      const signedValue = kind === "loan" ? -value : value;
      const protocol =
        attr.application_metadata?.name ?? item.relationships?.dapp?.data?.id ?? null;
      positions.push({
        id: item.id ?? `${chain}-${symbol}-${index}`,
        chain,
        protocol,
        protocolIconUrl: attr.application_metadata?.icon?.url ?? null,
        kind,
        symbol,
        name,
        iconUrl: info.icon?.url ?? null,
        groupId: attr.group_id ?? null,
        valueUsd: signedValue,
      });
      defiUsd += signedValue;
    }
  }

  tokens.sort((a, b) => b.valueUsd - a.valueUsd);
  positions.sort((a, b) => b.valueUsd - a.valueUsd);

  return {
    address: address.toLowerCase(),
    tokens,
    positions,
    walletUsd,
    defiUsd,
    totalUsd: walletUsd + defiUsd,
    chains: [...chains],
    provider: "zerion",
    updatedAt: Date.now(),
  };
}

export class ZerionProvider implements PortfolioProvider {
  readonly name = "zerion";

  constructor(private readonly apiKey: string) {}

  async getPortfolio(address: string): Promise<AutoPortfolio> {
    // Zerion defaults to `filter[positions]=only_simple` when omitted, which
    // silently strips out DeFi positions (deposits, loans, staking, rewards)
    // and leaves only plain wallet-token balances. `no_filter` is required to
    // get the complete, multi-chain picture (the entire point of this flow).
    const url =
      `${ZERION_BASE}/wallets/${address}/positions/` +
      `?currency=usd&filter[trash]=only_non_trash&filter[positions]=no_filter&sort=value`;

    const res = await fetch(url, {
      headers: { authorization: this.authHeader(), accept: "application/json" },
      // Positions change slowly relative to prices; cache briefly.
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      throw new Error(`Zerion request failed: ${res.status}`);
    }

    const payload = (await res.json()) as ZerionPositionsResponse;
    return mapZerionPositions(address, payload);
  }

  private authHeader(): string {
    return `Basic ${Buffer.from(`${this.apiKey}:`).toString("base64")}`;
  }

  /**
   * Realized/unrealized PnL — Zerion computes this server-side from the
   * wallet's full transaction history, so there's no cost-basis math to do
   * here at all.
   */
  async getPnl(address: string): Promise<WalletPnl> {
    const res = await fetch(`${ZERION_BASE}/wallets/${address}/pnl/?currency=usd`, {
      headers: { authorization: this.authHeader(), accept: "application/json" },
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error(`Zerion PnL request failed: ${res.status}`);

    const payload = (await res.json()) as { data?: { attributes?: Record<string, number> } };
    const a = payload.data?.attributes ?? {};
    return {
      totalGainUsd: a.total_gain ?? 0,
      realizedGainUsd: a.realized_gain ?? 0,
      unrealizedGainUsd: a.unrealized_gain ?? 0,
      totalGainPct: a.relative_total_gain_percentage ?? null,
      realizedGainPct: a.relative_realized_gain_percentage ?? null,
      unrealizedGainPct: a.relative_unrealized_gain_percentage ?? null,
      totalInvestedUsd: a.total_invested ?? 0,
      netInvestedUsd: a.net_invested ?? 0,
      updatedAt: Date.now(),
    };
  }

  /**
   * Per-token realized/unrealized PnL. Zerion's PnL endpoint only returns a
   * per-token breakdown when the request is filtered to specific fungible
   * ids (undocumented default is wallet-aggregate only) — so this always
   * passes `filter[fungible_ids]` explicitly. Capped at 15 ids per call to
   * keep the query small; callers should pass their highest-value holdings.
   */
  async getTokenPnl(address: string, fungibleIds: string[]): Promise<TokenPnl[]> {
    const ids = fungibleIds.slice(0, 15);
    if (ids.length === 0) return [];

    const url =
      `${ZERION_BASE}/wallets/${address}/pnl/` +
      `?currency=usd&filter[fungible_ids]=${ids.map(encodeURIComponent).join(",")}`;
    const res = await fetch(url, {
      headers: { authorization: this.authHeader(), accept: "application/json" },
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error(`Zerion per-token PnL request failed: ${res.status}`);

    const payload = (await res.json()) as {
      data?: { attributes?: { breakdown?: { by_id?: Record<string, Record<string, number>> } } };
    };
    const byId = payload.data?.attributes?.breakdown?.by_id ?? {};

    return Object.entries(byId).map(([fungibleId, a]) => ({
      fungibleId,
      averageBuyPriceUsd: a.average_buy_price ?? null,
      averageSellPriceUsd: a.average_sell_price ?? null,
      totalGainUsd: a.total_gain ?? 0,
      realizedGainUsd: a.realized_gain ?? 0,
      unrealizedGainUsd: a.unrealized_gain ?? 0,
      totalGainPct: a.relative_total_gain_percentage ?? null,
      realizedGainPct: a.relative_realized_gain_percentage ?? null,
      unrealizedGainPct: a.relative_unrealized_gain_percentage ?? null,
      totalInvestedUsd: a.total_invested ?? 0,
    }));
  }

  /**
   * Fetches one page of recent transactions, shared by getGasSpend and
   * getRecentActivity — same URL, so Next's fetch cache (revalidate: 300)
   * serves both from a single Zerion request within the cache window instead
   * of doubling quota use for two features reading the same data.
   */
  private async fetchRecentTransactions(address: string): Promise<ZerionTransaction[]> {
    const res = await fetch(
      `${ZERION_BASE}/wallets/${address}/transactions/?currency=usd&filter[trash]=no_filter&page[size]=100`,
      { headers: { authorization: this.authHeader(), accept: "application/json" }, next: { revalidate: 300 } },
    );
    if (!res.ok) throw new Error(`Zerion transactions request failed: ${res.status}`);
    const payload = (await res.json()) as { data?: ZerionTransaction[] };
    return payload.data ?? [];
  }

  /**
   * Gas spend over the most recent page of transactions (capped at one
   * request — this key's rate limit is tight, so we don't paginate through a
   * wallet's full history just to total gas fees).
   */
  async getGasSpend(address: string): Promise<GasSpendSummary> {
    const transactions = await this.fetchRecentTransactions(address);

    const byChain = new Map<string, number>();
    let totalUsd = 0;
    let txCount = 0;
    let oldestMinedAt: string | null = null;

    for (const tx of transactions) {
      const feeUsd = tx.attributes?.fee?.value;
      if (typeof feeUsd !== "number" || feeUsd <= 0) continue;
      const chain = tx.relationships?.chain?.data?.id ?? "unknown";
      byChain.set(chain, (byChain.get(chain) ?? 0) + feeUsd);
      totalUsd += feeUsd;
      txCount += 1;
      const minedAt = tx.attributes?.mined_at ?? null;
      if (minedAt && (!oldestMinedAt || minedAt < oldestMinedAt)) oldestMinedAt = minedAt;
    }

    return {
      totalUsd,
      txCount,
      byChain: [...byChain.entries()].map(([chain, valueUsd]) => ({ chain, valueUsd })),
      oldestMinedAt,
      updatedAt: Date.now(),
    };
  }

  /** Recent onchain activity feed, from the same transactions page as getGasSpend. */
  async getRecentActivity(address: string, limit = 20): Promise<ActivityItem[]> {
    const transactions = await this.fetchRecentTransactions(address);

    return transactions.slice(0, limit).map((tx) => {
      const chain = tx.relationships?.chain?.data?.id ?? "unknown";
      const hash = tx.attributes?.hash ?? "";
      return {
        id: tx.id ?? hash,
        type: tx.attributes?.operation_type ?? "unknown",
        status: (tx.attributes?.status as ActivityItem["status"]) ?? "confirmed",
        occurredAt: tx.attributes?.mined_at ?? "",
        hash,
        chain,
        explorerUrl: hash ? explorerTxUrl(chain, hash) : null,
        transfers: (tx.attributes?.transfers ?? []).map((t) => ({
          direction: t.direction === "out" ? "out" : "in",
          symbol: t.fungible_info?.symbol ?? "?",
          quantity: t.quantity?.float ?? 0,
          valueUsd: typeof t.value === "number" ? t.value : null,
        })),
      };
    });
  }
}
