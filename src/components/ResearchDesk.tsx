"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatPercent, formatUsd } from "@/lib/format";
import { protocolIconUrl } from "@/lib/chainIcons";
import { researchItemId, type PoolHit, type PoolPoint, type ResearchItem, type TokenHit, type TokenProfile } from "@/lib/research";
import { POOL_DATA_UNAVAILABLE } from "@/lib/yields";
import type { ProtocolFact } from "@/lib/depositChecklist";
import { TrueYieldCalculator } from "./TrueYieldCalculator";
import { ChainIcon } from "./ChainIcon";
import { IconImg } from "./IconImg";

type DeskTab = "token" | "pool" | "compare" | "saved";

const chartStyle = {
  background: "var(--surface-raised)",
  border: "1px solid var(--border-subtle)",
  borderRadius: 12,
  color: "var(--foreground)",
};

export function ResearchDesk({
  saved,
  onToggleSaved,
}: {
  saved: ResearchItem[];
  onToggleSaved: (item: ResearchItem) => void;
}) {
  const [tab, setTab] = useState<DeskTab>("token");
  const [query, setQuery] = useState("");
  const [tokenId, setTokenId] = useState<string | null>(null);
  const [poolId, setPoolId] = useState<string | null>(null);
  const [compare, setCompare] = useState<ResearchItem[]>([]);

  const tokenSearch = useQuery({
    queryKey: ["research-tokens", query],
    enabled: tab === "token" && query.trim().length >= 2,
    queryFn: async () => {
      const res = await fetch(`/api/research/tokens?q=${encodeURIComponent(query.trim())}`);
      if (!res.ok) throw new Error("search failed");
      return (await res.json()) as { tokens: TokenHit[] };
    },
  });
  const poolSearch = useQuery({
    queryKey: ["research-pools", query],
    enabled: tab === "pool" && query.trim().length >= 2,
    queryFn: async () => {
      const res = await fetch(`/api/research/pools?q=${encodeURIComponent(query.trim())}`);
      if (!res.ok) throw new Error("search failed");
      return (await res.json()) as { pools: PoolHit[]; unavailable?: boolean };
    },
  });
  const tokenDetail = useQuery({
    queryKey: ["research-token", tokenId],
    enabled: !!tokenId,
    queryFn: async () => {
      const res = await fetch(`/api/research/token?id=${encodeURIComponent(tokenId!)}`);
      if (!res.ok) throw new Error("detail failed");
      return (await res.json()) as { profile: TokenProfile; points: { t: number; priceUsd: number }[] };
    },
  });
  const poolDetail = useQuery({
    queryKey: ["research-pool", poolId],
    enabled: !!poolId,
    queryFn: async () => {
      const res = await fetch(`/api/research/pool?id=${encodeURIComponent(poolId!)}`);
      if (!res.ok) throw new Error("detail failed");
      return (await res.json()) as {
        pool: PoolHit | null;
        history: PoolPoint[];
        protocol?: ProtocolFact | null;
        unavailable?: boolean;
      };
    },
  });

  function remember(item: ResearchItem) {
    onToggleSaved(item);
  }

  function addCompare(item: ResearchItem) {
    setCompare((current) => {
      if (current.some((entry) => entry.id === item.id)) return current;
      return [...current, item].slice(-3);
    });
    setTab("compare");
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="max-w-2xl text-sm text-text-secondary">
          A quiet desk for public market and pool data. Figures come from CoinGecko and DeFiLlama,
          can be delayed, and are not financial advice.
        </p>
      </div>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Research">
        {(
          [
            ["token", "Token"],
            ["pool", "Pool"],
            ["compare", "Compare"],
            ["saved", "Saved"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className="layout-chip"
            onClick={() => setTab(id)}
          >
            {label}
            {id === "saved" ? ` (${saved.length})` : ""}
          </button>
        ))}
      </div>

      {tab === "token" || tab === "pool" ? (
        <label className="block">
          <span className="text-xs tracking-wide text-text-muted uppercase">
            {tab === "token" ? "Look up a token" : "Look up a pool"}
          </span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={tab === "token" ? "Name or symbol, like ether" : "Protocol or pair, like aave"}
            className="mt-2 w-full rounded-xl border border-border-subtle bg-surface px-3 py-2.5 text-sm text-foreground"
          />
        </label>
      ) : null}

      {tab === "token" ? (
        <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <ResultList
            loading={tokenSearch.isFetching}
            error={tokenSearch.isError}
            empty={query.trim().length < 2 ? "Type at least two letters." : "No public match."}
            items={(tokenSearch.data?.tokens ?? []).map((token) => ({
              id: researchItemId("token", token.id),
              title: token.symbol,
              subtitle: token.name,
              image: token.image,
              onOpen: () => setTokenId(token.id),
              onSave: () => remember({ id: researchItemId("token", token.id), kind: "token", label: token.symbol, subtitle: token.name, savedAt: Date.now() }),
              onCompare: () => addCompare({ id: researchItemId("token", token.id), kind: "token", label: token.symbol, subtitle: token.name, savedAt: Date.now() }),
              saved: saved.some((item) => item.id === researchItemId("token", token.id)),
            }))}
          />
          <TokenDetail
            detail={tokenDetail.data}
            loading={tokenDetail.isFetching}
            error={tokenDetail.isError}
            onSave={
              tokenDetail.data
                ? () =>
                    remember({
                      id: researchItemId("token", tokenDetail.data!.profile.id),
                      kind: "token",
                      label: tokenDetail.data!.profile.symbol,
                      subtitle: tokenDetail.data!.profile.name,
                      savedAt: Date.now(),
                    })
                : undefined
            }
          />
        </div>
      ) : null}

      {tab === "pool" ? (
        poolSearch.data?.unavailable || poolSearch.isError ? (
          <p className="text-sm text-text-muted">{POOL_DATA_UNAVAILABLE}</p>
        ) : (
        <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <ResultList
            loading={poolSearch.isFetching}
            error={false}
            empty={query.trim().length < 2 ? "Type at least two letters." : "No pool matched."}
            items={(poolSearch.data?.pools ?? []).map((pool) => ({
              id: researchItemId("pool", pool.id),
              title: pool.symbol,
              subtitle: `${pool.project} · ${pool.chain}`,
              image: protocolIconUrl(pool.project),
              chain: pool.chain,
              onOpen: () => setPoolId(pool.id),
              onSave: () =>
                remember({
                  id: researchItemId("pool", pool.id),
                  kind: "pool",
                  label: pool.symbol,
                  subtitle: `${pool.project} · ${pool.chain}`,
                  savedAt: Date.now(),
                }),
              onCompare: () =>
                addCompare({
                  id: researchItemId("pool", pool.id),
                  kind: "pool",
                  label: pool.symbol,
                  subtitle: `${pool.project} · ${pool.chain}`,
                  savedAt: Date.now(),
                }),
              saved: saved.some((item) => item.id === researchItemId("pool", pool.id)),
            }))}
          />
          <PoolDetail
            detail={poolDetail.data}
            loading={poolDetail.isFetching}
            error={poolDetail.isError}
            unavailable={poolDetail.data?.unavailable === true}
          />
        </div>
        )
      ) : null}

      {tab === "compare" ? (
        <ComparePane items={compare} onRemove={(id) => setCompare((current) => current.filter((item) => item.id !== id))} />
      ) : null}

      {tab === "saved" ? (
        <ul className="flex flex-col gap-2">
          {saved.length === 0 ? (
            <li className="rounded-2xl border border-border-subtle bg-surface px-4 py-8 text-sm text-text-muted">
              Nothing saved yet. Look up a token or pool and keep it here.
            </li>
          ) : (
            saved.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border-subtle bg-surface px-4 py-3">
                <button
                  type="button"
                  className="text-left"
                  onClick={() => {
                    const raw = item.id.split(":").slice(1).join(":");
                    if (item.kind === "token") {
                      setTokenId(raw);
                      setTab("token");
                    } else {
                      setPoolId(raw);
                      setTab("pool");
                    }
                  }}
                >
                  <span className="block text-sm text-foreground">{item.label}</span>
                  <span className="block text-xs text-text-muted">{item.subtitle}</span>
                </button>
                <span className="flex gap-3">
                  <button type="button" className="text-xs text-accent" onClick={() => addCompare(item)}>
                    Compare
                  </button>
                  <button type="button" className="text-xs text-text-muted" onClick={() => remember(item)}>
                    Remove
                  </button>
                </span>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}

function ResultList({
  items,
  loading,
  error,
  empty,
}: {
  items: {
    id: string;
    title: string;
    subtitle: string;
    image: string | null;
    chain?: string;
    saved: boolean;
    onOpen: () => void;
    onSave: () => void;
    onCompare: () => void;
  }[];
  loading: boolean;
  error: boolean;
  empty: string;
}) {
  if (loading && items.length === 0) return <p className="text-sm text-text-muted">Looking that up…</p>;
  if (error) return <p className="text-sm text-warning">That lookup didn’t respond. Try again in a minute.</p>;
  if (items.length === 0) return <p className="text-sm text-text-muted">{empty}</p>;
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item.id} className="rounded-2xl border border-border-subtle bg-surface p-3">
          <button type="button" onClick={item.onOpen} className="flex w-full items-center gap-2 text-left">
            <span className="relative">
              <IconImg src={item.image} alt="" fallbackText={item.title} size={28} />
              {item.chain ? (
                <span className="absolute -right-1 -bottom-1">
                  <ChainIcon chain={item.chain} size={12} />
                </span>
              ) : null}
            </span>
            <span>
              <span className="block text-sm text-foreground">{item.title}</span>
              <span className="block text-xs text-text-muted">{item.subtitle}</span>
            </span>
          </button>
          <span className="mt-2 flex gap-3">
            <button type="button" className="text-xs text-accent" onClick={item.onSave}>
              {item.saved ? "Saved" : "Save"}
            </button>
            <button type="button" className="text-xs text-text-muted" onClick={item.onCompare}>
              Compare
            </button>
          </span>
        </li>
      ))}
    </ul>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-background/50 px-3 py-2">
      <p className="text-[11px] tracking-wide text-text-muted uppercase">{label}</p>
      <p className="mt-1 text-sm text-foreground">{value}</p>
    </div>
  );
}

function TokenDetail({
  detail,
  loading,
  error,
  onSave,
}: {
  detail?: { profile: TokenProfile; points: { t: number; priceUsd: number }[] };
  loading: boolean;
  error: boolean;
  onSave?: () => void;
}) {
  if (!detail && loading) return <p className="text-sm text-text-muted">Opening the token…</p>;
  if (error) return <p className="text-sm text-warning">The token detail didn’t load.</p>;
  if (!detail) {
    return (
      <div className="rounded-3xl border border-dashed border-border-subtle px-6 py-16 text-sm text-text-muted">
        Choose a token to see price history, supply, and where its contracts live.
      </div>
    );
  }
  const { profile, points } = detail;
  return (
    <article className="rounded-3xl border border-border-subtle bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <IconImg src={profile.image} alt="" fallbackText={profile.symbol} size={40} />
          <div>
            <h2 className="text-2xl font-semibold text-foreground">{profile.name}</h2>
            <p className="text-sm text-text-muted">{profile.symbol}</p>
          </div>
        </div>
        {onSave ? (
          <button type="button" className="layout-chip" onClick={onSave}>
            Save
          </button>
        ) : null}
      </div>
      <p className="mt-4 font-display text-3xl text-foreground">{profile.priceUsd === null ? "—" : formatUsd(profile.priceUsd)}</p>
      <p className={`text-sm ${ (profile.change24h ?? 0) >= 0 ? "text-positive" : "text-negative" }`}>{formatPercent(profile.change24h)} today</p>
      <div className="mt-4 h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points}>
            <XAxis dataKey="t" hide />
            <YAxis hide domain={["auto", "auto"]} />
            <Tooltip contentStyle={chartStyle} formatter={(value) => formatUsd(Number(value))} labelFormatter={(value) => new Date(Number(value)).toLocaleDateString()} />
            <Area dataKey="priceUsd" stroke="var(--accent)" fill="var(--chart-fill)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Market cap" value={profile.marketCap === null ? "—" : formatUsd(profile.marketCap)} />
        <Stat label="Volume 24h" value={profile.volume24h === null ? "—" : formatUsd(profile.volume24h)} />
        <Stat label="Circulating" value={profile.circulating === null ? "—" : profile.circulating.toLocaleString("en-US")} />
        <Stat label="Total supply" value={profile.totalSupply === null ? "—" : profile.totalSupply.toLocaleString("en-US")} />
      </div>
      {profile.contracts.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-1 text-xs text-text-muted">
          {profile.contracts.slice(0, 6).map((contract) => (
            <li key={`${contract.chain}-${contract.address}`} className="truncate">
              {contract.chain} · {contract.address}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

function PoolDetail({
  detail,
  loading,
  error,
  unavailable = false,
}: {
  detail?: { pool: PoolHit | null; history: PoolPoint[]; protocol?: ProtocolFact | null; unavailable?: boolean };
  loading: boolean;
  error: boolean;
  unavailable?: boolean;
}) {
  if (unavailable || detail?.unavailable || (error && !detail?.pool)) {
    return <p className="text-sm text-text-muted">{POOL_DATA_UNAVAILABLE}</p>;
  }
  if (!detail && loading) return <p className="text-sm text-text-muted">Opening the pool…</p>;
  if (!detail?.pool) {
    return (
      <div className="rounded-3xl border border-dashed border-border-subtle px-6 py-16 text-sm text-text-muted">
        Choose a pool to see TVL, and how the yield splits between base and rewards.
      </div>
    );
  }
  const { pool, history } = detail;
  if (!pool) return null;
  return (
    <article className="rounded-3xl border border-border-subtle bg-surface p-5">
      <div className="flex items-center gap-3">
        <span className="relative">
          <IconImg src={protocolIconUrl(pool.project)} alt="" fallbackText={pool.project} size={40} />
          <span className="absolute -right-1 -bottom-1">
            <ChainIcon chain={pool.chain} size={16} />
          </span>
        </span>
        <div>
          <h2 className="text-2xl font-semibold text-foreground">{pool.symbol}</h2>
          <p className="text-sm text-text-muted">{pool.project} · {pool.chain}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="TVL" value={formatUsd(pool.tvlUsd)} />
        <Stat label="APY" value={pool.apy === null ? "—" : `${pool.apy.toFixed(2)}%`} />
        <Stat label="Base APY" value={pool.apyBase === null ? "—" : `${pool.apyBase.toFixed(2)}%`} />
        <Stat label="Reward APY" value={pool.apyReward === null ? "—" : `${pool.apyReward.toFixed(2)}%`} />
      </div>
      <div className="mt-4 h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={history}>
            <XAxis dataKey="t" hide />
            <YAxis hide domain={["auto", "auto"]} />
            <Tooltip contentStyle={chartStyle} />
            <Area dataKey="apy" name="APY" stroke="var(--accent)" fill="var(--chart-fill)" strokeWidth={2} />
            <Area dataKey="apyBase" name="Base APY" stroke="#8fbf98" fill="transparent" strokeWidth={1.5} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-text-muted">Copper is total APY. Green is the base APY, without reward incentives.</p>
      <TrueYieldCalculator pool={pool} protocol={detail.protocol ?? null} />
    </article>
  );
}

function ComparePane({ items, onRemove }: { items: ResearchItem[]; onRemove: (id: string) => void }) {
  const details = useQuery({
    queryKey: ["research-compare", items.map((item) => item.id).join("|")],
    enabled: items.length > 0,
    queryFn: async () => {
      return Promise.all(
        items.map(async (item) => {
          const raw = item.id.split(":").slice(1).join(":");
          if (item.kind === "token") {
            const res = await fetch(`/api/research/token?id=${encodeURIComponent(raw)}`);
            if (!res.ok) return { item, profile: null as TokenProfile | null, pool: null as PoolHit | null, unavailable: false };
            const data = (await res.json()) as { profile: TokenProfile };
            return { item, profile: data.profile, pool: null, unavailable: false };
          }
          const res = await fetch(`/api/research/pool?id=${encodeURIComponent(raw)}`);
          if (!res.ok) return { item, profile: null, pool: null as PoolHit | null, unavailable: true };
          const data = (await res.json()) as { pool: PoolHit | null; unavailable?: boolean };
          return { item, profile: null, pool: data.pool, unavailable: data.unavailable === true };
        }),
      );
    },
  });

  if (items.length === 0) {
    return <p className="text-sm text-text-muted">Add two or three tokens or pools to read them side by side.</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {(details.data ?? items.map((item) => ({ item, profile: null, pool: null, unavailable: false }))).map((column) => (
        <article key={column.item.id} className="rounded-2xl border border-border-subtle bg-surface p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{column.item.label}</h2>
              <p className="text-xs text-text-muted">{column.item.subtitle}</p>
            </div>
            <button type="button" className="text-xs text-text-muted" onClick={() => onRemove(column.item.id)}>
              Remove
            </button>
          </div>
          {column.profile ? (
            <dl className="mt-3 space-y-2 text-sm">
              <Row k="Price" v={column.profile.priceUsd === null ? "—" : formatUsd(column.profile.priceUsd)} />
              <Row k="24h" v={formatPercent(column.profile.change24h)} />
              <Row k="Market cap" v={column.profile.marketCap === null ? "—" : formatUsd(column.profile.marketCap)} />
              <Row k="Volume" v={column.profile.volume24h === null ? "—" : formatUsd(column.profile.volume24h)} />
            </dl>
          ) : column.pool ? (
            <dl className="mt-3 space-y-2 text-sm">
              <Row k="TVL" v={formatUsd(column.pool.tvlUsd)} />
              <Row k="APY" v={column.pool.apy === null ? "—" : `${column.pool.apy.toFixed(2)}%`} />
              <Row k="Base APY" v={column.pool.apyBase === null ? "—" : `${column.pool.apyBase.toFixed(2)}%`} />
              <Row k="Reward APY" v={column.pool.apyReward === null ? "—" : `${column.pool.apyReward.toFixed(2)}%`} />
            </dl>
          ) : (
            <p className="mt-3 text-sm text-text-muted">
              {details.isFetching ? "Loading…" : column.item.kind === "pool" || column.unavailable ? POOL_DATA_UNAVAILABLE : "Details unavailable."}
            </p>
          )}
        </article>
      ))}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-text-muted">{k}</dt>
      <dd className="text-foreground">{v}</dd>
    </div>
  );
}
