import { formatUsd } from "@/lib/format";
import { isNativeToken } from "@/lib/tokenIcons";
import type { TokenHolding } from "@/types";

export type GroupBy = "token" | "chain" | "wallet" | "type";
export type BalanceScope = "combined" | "per-wallet";
export type BalanceStyle = "table" | "cards";
export type BalanceSort = "value" | "name" | "change";
export type DisplayCurrency = "USD" | "EUR" | "GBP" | "JPY" | "ETH" | "BTC";
export type AssetKind = "stable" | "native" | "token" | "defi";

export type TaggedHolding = TokenHolding & { wallet: string };

export type DefiSlice = {
  id: string;
  label: string;
  valueUsd: number;
  chain: string;
};

export type BalanceGroup = {
  id: string;
  label: string;
  valueUsd: number;
  items: TaggedHolding[];
};

export type BalanceViewOptions = {
  groupBy: GroupBy;
  scope: BalanceScope;
  style: BalanceStyle;
  sort: BalanceSort;
  hideDust: boolean;
};

export const DEFAULT_BALANCE_VIEW: BalanceViewOptions = {
  groupBy: "token",
  scope: "combined",
  style: "table",
  sort: "value",
  hideDust: false,
};

export const DUST_USD = 1;

export type FxRates = {
  eurPerUsd: number;
  gbpPerUsd: number;
  jpyPerUsd: number;
  ethUsd: number;
  btcUsd: number;
};

const STABLES = new Set([
  "USDC",
  "USDT",
  "DAI",
  "USDBC",
  "FRAX",
  "LUSD",
  "GHO",
  "CRVUSD",
  "USDS",
  "PYUSD",
  "TUSD",
  "USDE",
  "USD0",
  "USDT0",
  "USD₮0",
  "EURC",
  "USDM",
]);

export function classifyHolding(holding: Pick<TaggedHolding, "symbol" | "address">): Exclude<AssetKind, "defi"> {
  if (isNativeToken(holding.address)) return "native";
  if (STABLES.has(holding.symbol.toUpperCase())) return "stable";
  return "token";
}

export function isDust(holding: Pick<TaggedHolding, "priceUsd" | "valueUsd">, threshold = DUST_USD): boolean {
  if (holding.priceUsd === null) return true;
  return holding.valueUsd < threshold;
}

export function applyScope(holdings: TaggedHolding[], scope: BalanceScope): TaggedHolding[] {
  if (scope === "per-wallet") return holdings.map((holding) => ({ ...holding }));
  const merged = new Map<string, TaggedHolding>();
  for (const holding of holdings) {
    const key = `${holding.chain}:${holding.address.toLowerCase()}:${holding.symbol}`;
    const prev = merged.get(key);
    if (!prev) {
      merged.set(key, { ...holding, wallet: "Combined" });
      continue;
    }
    prev.balance += holding.balance;
    prev.valueUsd += holding.valueUsd;
    if (prev.priceUsd === null) prev.priceUsd = holding.priceUsd;
    if (prev.change24h === null) prev.change24h = holding.change24h;
  }
  return [...merged.values()];
}

const TYPE_LABEL: Record<AssetKind, string> = {
  stable: "Stablecoins",
  native: "Native assets",
  token: "Tokens",
  defi: "DeFi",
};

function compareItems(sort: BalanceSort) {
  return (a: TaggedHolding, b: TaggedHolding) => {
    if (sort === "name") return a.symbol.localeCompare(b.symbol);
    if (sort === "change") return (b.change24h ?? -Infinity) - (a.change24h ?? -Infinity);
    return b.valueUsd - a.valueUsd;
  };
}

export function groupBalances(input: {
  holdings: TaggedHolding[];
  defi?: DefiSlice[];
  groupBy: GroupBy;
  hideDust: boolean;
  sort: BalanceSort;
}): BalanceGroup[] {
  const holdings = input.hideDust ? input.holdings.filter((holding) => !isDust(holding)) : input.holdings;
  const defi = (input.defi ?? []).filter((slice) => (input.hideDust ? slice.valueUsd >= DUST_USD : slice.valueUsd !== 0));
  const buckets = new Map<string, BalanceGroup>();

  const ensure = (id: string, label: string) => {
    let group = buckets.get(id);
    if (!group) {
      group = { id, label, valueUsd: 0, items: [] };
      buckets.set(id, group);
    }
    return group;
  };

  for (const holding of holdings) {
    let id = holding.symbol.toUpperCase();
    let label = holding.symbol;
    if (input.groupBy === "chain") {
      id = holding.chain;
      label = holding.chain;
    } else if (input.groupBy === "wallet") {
      id = holding.wallet;
      label = holding.wallet;
    } else if (input.groupBy === "type") {
      const kind = classifyHolding(holding);
      id = kind;
      label = TYPE_LABEL[kind];
    }
    const group = ensure(id, label);
    group.items.push(holding);
    group.valueUsd += holding.valueUsd;
  }

  if (input.groupBy === "type" && defi.length > 0) {
    const group = ensure("defi", TYPE_LABEL.defi);
    group.valueUsd += defi.reduce((sum, slice) => sum + slice.valueUsd, 0);
  } else if (input.groupBy === "chain") {
    for (const slice of defi) {
      const group = ensure(slice.chain, slice.chain);
      group.valueUsd += slice.valueUsd;
    }
  }

  const itemSort = compareItems(input.sort);
  const groups = [...buckets.values()];
  for (const group of groups) group.items.sort(itemSort);

  groups.sort((a, b) => {
    if (input.sort === "name") return a.label.localeCompare(b.label);
    return b.valueUsd - a.valueUsd;
  });
  return groups;
}

export function allocationFromGroups(groups: BalanceGroup[]): { id: string; name: string; value: number }[] {
  return groups
    .filter((group) => group.valueUsd > 0)
    .map((group) => ({ id: group.id, name: group.label, value: group.valueUsd }));
}

export function formatMoney(usd: number, currency: DisplayCurrency, rates: FxRates | null): string {
  if (!Number.isFinite(usd)) return formatUsd(0);
  if (currency === "USD" || !rates) return formatUsd(usd);
  if (currency === "ETH") {
    if (rates.ethUsd <= 0) return formatUsd(usd);
    const amount = usd / rates.ethUsd;
    return `${amount.toLocaleString("en-US", { maximumFractionDigits: amount >= 1 ? 4 : 6 })} ETH`;
  }
  if (currency === "BTC") {
    if (rates.btcUsd <= 0) return formatUsd(usd);
    const amount = usd / rates.btcUsd;
    return `${amount.toLocaleString("en-US", { maximumFractionDigits: amount >= 1 ? 4 : 6 })} BTC`;
  }
  const perUsd = currency === "EUR" ? rates.eurPerUsd : currency === "GBP" ? rates.gbpPerUsd : rates.jpyPerUsd;
  if (!Number.isFinite(perUsd) || perUsd <= 0) return formatUsd(usd);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "JPY" ? 0 : 2,
  }).format(usd * perUsd);
}

export function normalizeBalanceView(raw: unknown): BalanceViewOptions {
  const source = raw && typeof raw === "object" ? (raw as Partial<BalanceViewOptions>) : {};
  const groupBy = source.groupBy;
  const scope = source.scope;
  const style = source.style;
  const sort = source.sort;
  return {
    groupBy: groupBy === "chain" || groupBy === "wallet" || groupBy === "type" || groupBy === "token" ? groupBy : "token",
    scope: scope === "per-wallet" || scope === "combined" ? scope : "combined",
    style: style === "cards" || style === "table" ? style : "table",
    sort: sort === "name" || sort === "change" || sort === "value" ? sort : "value",
    hideDust: source.hideDust === true,
  };
}

export function normalizeCurrency(raw: unknown): DisplayCurrency {
  if (raw === "EUR" || raw === "GBP" || raw === "JPY" || raw === "ETH" || raw === "BTC" || raw === "USD") return raw;
  return "USD";
}
