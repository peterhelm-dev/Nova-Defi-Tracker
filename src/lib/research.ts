export type TokenHit = {
  id: string;
  name: string;
  symbol: string;
  image: string | null;
};

export type TokenContract = { chain: string; address: string };

export type TokenProfile = TokenHit & {
  priceUsd: number | null;
  change24h: number | null;
  marketCap: number | null;
  volume24h: number | null;
  circulating: number | null;
  totalSupply: number | null;
  contracts: TokenContract[];
};

export type PoolHit = {
  id: string;
  project: string;
  symbol: string;
  chain: string;
  tvlUsd: number;
  apy: number | null;
  apyBase: number | null;
  apyReward: number | null;
};

export type PoolPoint = {
  t: number;
  tvlUsd: number;
  apy: number | null;
  apyBase: number | null;
  apyReward: number | null;
};

export type ResearchKind = "token" | "pool";

export type ResearchItem = {
  id: string;
  kind: ResearchKind;
  label: string;
  subtitle: string;
  savedAt: number;
};

const PLATFORM_LABELS: Record<string, string> = {
  ethereum: "Ethereum",
  base: "Base",
  "arbitrum-one": "Arbitrum",
  "optimistic-ethereum": "Optimism",
  "polygon-pos": "Polygon",
  avalanche: "Avalanche",
  "binance-smart-chain": "BNB Chain",
};

export function mapTokenSearch(payload: unknown): TokenHit[] {
  const coins = (payload as { coins?: unknown })?.coins;
  if (!Array.isArray(coins)) return [];
  const hits: (TokenHit & { rank: number })[] = [];
  for (const coin of coins) {
    if (!coin || typeof coin !== "object") continue;
    const row = coin as Record<string, unknown>;
    if (typeof row.id !== "string" || typeof row.symbol !== "string") continue;
    const rank = typeof row.market_cap_rank === "number" ? row.market_cap_rank : Number.POSITIVE_INFINITY;
    hits.push({
      id: row.id,
      name: typeof row.name === "string" ? row.name : row.symbol,
      symbol: row.symbol.toUpperCase(),
      image: typeof row.thumb === "string" ? row.thumb : typeof row.large === "string" ? row.large : null,
      rank,
    });
    if (hits.length >= 40) break;
  }
  hits.sort((a, b) => a.rank - b.rank);
  return hits.slice(0, 8).map((hit) => ({
    id: hit.id,
    name: hit.name,
    symbol: hit.symbol,
    image: hit.image,
  }));
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function mapTokenProfile(payload: unknown): TokenProfile | null {
  if (!payload || typeof payload !== "object") return null;
  const row = payload as Record<string, unknown>;
  if (typeof row.id !== "string") return null;
  const image = row.image as { large?: string; small?: string } | undefined;
  const market = row.market_data as Record<string, unknown> | undefined;
  const platforms = row.platforms as Record<string, unknown> | undefined;
  const contracts: TokenContract[] = [];
  if (platforms) {
    for (const [platform, address] of Object.entries(platforms)) {
      if (typeof address !== "string" || address.length < 4) continue;
      contracts.push({ chain: PLATFORM_LABELS[platform] ?? platform, address });
    }
  }
  return {
    id: row.id,
    name: typeof row.name === "string" ? row.name : row.id,
    symbol: typeof row.symbol === "string" ? row.symbol.toUpperCase() : row.id.toUpperCase(),
    image: image?.large ?? image?.small ?? null,
    priceUsd: num((market?.current_price as { usd?: number } | undefined)?.usd),
    change24h: num(market?.price_change_percentage_24h),
    marketCap: num((market?.market_cap as { usd?: number } | undefined)?.usd),
    volume24h: num((market?.total_volume as { usd?: number } | undefined)?.usd),
    circulating: num(market?.circulating_supply),
    totalSupply: num(market?.total_supply),
    contracts,
  };
}

export function mapMarketChart(payload: unknown): { t: number; priceUsd: number }[] {
  const prices = (payload as { prices?: unknown })?.prices;
  if (!Array.isArray(prices)) return [];
  const points: { t: number; priceUsd: number }[] = [];
  for (const row of prices) {
    if (!Array.isArray(row) || row.length < 2) continue;
    const t = Number(row[0]);
    const priceUsd = Number(row[1]);
    if (!Number.isFinite(t) || !Number.isFinite(priceUsd)) continue;
    points.push({ t, priceUsd });
  }
  return points;
}

export function searchPools(pools: PoolHit[], query: string): PoolHit[] {
  const needle = query.trim().toLowerCase();
  if (needle.length < 2) return [];
  return pools
    .filter((pool) => `${pool.project} ${pool.symbol} ${pool.chain}`.toLowerCase().includes(needle))
    .sort((a, b) => b.tvlUsd - a.tvlUsd)
    .slice(0, 8);
}

export function mapPoolPoints(payload: unknown): PoolPoint[] {
  const rows = (payload as { data?: unknown })?.data;
  if (!Array.isArray(rows)) return [];
  const points: PoolPoint[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const point = row as Record<string, unknown>;
    const t = typeof point.timestamp === "string" ? Date.parse(point.timestamp) : Number(point.timestamp);
    if (!Number.isFinite(t)) continue;
    points.push({
      t,
      tvlUsd: num(point.tvlUsd) ?? 0,
      apy: num(point.apy),
      apyBase: num(point.apyBase),
      apyReward: num(point.apyReward),
    });
  }
  return points.slice(-90);
}

export function researchItemId(kind: ResearchKind, id: string): string {
  return `${kind}:${id}`;
}

export function normalizeWatchlist(raw: unknown): ResearchItem[] {
  if (!Array.isArray(raw)) return [];
  const items: ResearchItem[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Partial<ResearchItem>;
    if ((row.kind !== "token" && row.kind !== "pool") || typeof row.id !== "string") continue;
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    items.push({
      id: row.id,
      kind: row.kind,
      label: typeof row.label === "string" ? row.label.slice(0, 80) : row.id,
      subtitle: typeof row.subtitle === "string" ? row.subtitle.slice(0, 120) : "",
      savedAt: typeof row.savedAt === "number" ? row.savedAt : 0,
    });
    if (items.length >= 40) break;
  }
  return items.sort((a, b) => b.savedAt - a.savedAt);
}
