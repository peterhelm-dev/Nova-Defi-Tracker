"use client";

import { Fragment, useMemo, useState } from "react";
import { useDefiPools } from "@/hooks/useDefiPools";
import { formatPercent, formatUsd } from "@/lib/format";
import type { DefiPool, TrackedPosition } from "@/types";

type SortKey = "tvl" | "apy";

type DefiPoolsSectionProps = {
  positions: TrackedPosition[];
  onAdd: (input: Omit<TrackedPosition, "id" | "addedAt">) => void;
  onRemove: (id: string) => void;
};

export function DefiPoolsSection({
  positions,
  onAdd,
  onRemove,
}: DefiPoolsSectionProps) {
  const { data, isLoading, isError } = useDefiPools();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("tvl");
  const [trackingPoolId, setTrackingPoolId] = useState<string | null>(null);
  const [amountInput, setAmountInput] = useState("");

  const pools = useMemo(() => {
    const all = data?.pools ?? [];
    const filtered = search.trim()
      ? all.filter((pool) =>
          `${pool.project} ${pool.symbol}`
            .toLowerCase()
            .includes(search.trim().toLowerCase()),
        )
      : all;

    return [...filtered].sort((a, b) =>
      sortKey === "tvl"
        ? b.tvlUsd - a.tvlUsd
        : (b.apy ?? -Infinity) - (a.apy ?? -Infinity),
    ).slice(0, 25);
  }, [data, search, sortKey]);

  const positionsTotal = positions.reduce((sum, p) => sum + p.amountUsd, 0);

  function startTracking(pool: DefiPool) {
    setTrackingPoolId(pool.id);
    setAmountInput("");
  }

  function confirmTracking(pool: DefiPool) {
    const amountUsd = Number(amountInput);
    if (!Number.isFinite(amountUsd) || amountUsd <= 0) return;
    onAdd({
      poolId: pool.id,
      project: pool.project,
      symbol: pool.symbol,
      amountUsd,
      apyAtEntry: pool.apy,
    });
    setTrackingPoolId(null);
    setAmountInput("");
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-white/50">Base DeFi pools</p>
          <p className="text-xs text-white/40">
            Live TVL &amp; APY from DeFiLlama. Track a position to fold it
            into your net worth.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search project or pair…"
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="tvl">Sort by TVL</option>
            <option value="apy">Sort by APY</option>
          </select>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-white/40">
              <th className="pb-3 font-medium">Pool</th>
              <th className="pb-3 font-medium">TVL</th>
              <th className="pb-3 font-medium">APY</th>
              <th className="pb-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-white/40">
                  Loading Base pools…
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-amber-400">
                  DeFi pool data is temporarily unavailable.
                </td>
              </tr>
            )}
            {!isLoading && !isError && pools.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-white/40">
                  No pools match your search.
                </td>
              </tr>
            )}
            {pools.map((pool) => (
              <Fragment key={pool.id}>
                <tr>
                  <td className="py-3">
                    <p className="font-medium text-white">{pool.project}</p>
                    <p className="text-xs text-white/40">{pool.symbol}</p>
                  </td>
                  <td className="py-3 whitespace-nowrap text-white/80">
                    {formatUsd(pool.tvlUsd)}
                  </td>
                  <td className="py-3 whitespace-nowrap text-emerald-400">
                    {pool.apy !== null ? `${pool.apy.toFixed(2)}%` : "—"}
                  </td>
                  <td className="py-3 text-right">
                    {trackingPoolId === pool.id ? (
                      <span className="text-xs text-white/40">Tracking…</span>
                    ) : (
                      <button
                        onClick={() => startTracking(pool)}
                        className="whitespace-nowrap rounded-lg border border-white/15 px-2 py-1 text-xs font-medium text-white/80 hover:bg-white/10"
                      >
                        Track
                      </button>
                    )}
                  </td>
                </tr>
                {trackingPoolId === pool.id && (
                  <tr>
                    <td colSpan={4} className="pb-3">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <input
                          autoFocus
                          value={amountInput}
                          onChange={(e) => setAmountInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") confirmTracking(pool);
                            if (e.key === "Escape") setTrackingPoolId(null);
                          }}
                          placeholder="USD amount"
                          inputMode="decimal"
                          className="w-28 rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-right text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                        <button
                          onClick={() => confirmTracking(pool)}
                          className="rounded-lg bg-accent px-2 py-1 text-xs font-medium text-white hover:bg-accent/90"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setTrackingPoolId(null)}
                          className="rounded-lg border border-white/15 px-2 py-1 text-xs font-medium text-white/60 hover:bg-white/10"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 border-t border-white/10 pt-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-white/50">
            Your tracked positions
          </p>
          <p className="text-sm font-medium text-white">
            {formatUsd(positionsTotal)}
          </p>
        </div>
        {positions.length === 0 ? (
          <p className="mt-2 text-sm text-white/40">
            Nothing tracked yet — add a pool position above to include it in
            your net worth.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-white/5">
            {positions.map((position) => (
              <li
                key={position.id}
                className="flex items-center justify-between py-2 text-sm"
              >
                <div>
                  <p className="font-medium text-white">{position.project}</p>
                  <p className="text-xs text-white/40">{position.symbol}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-white/80">
                    {formatUsd(position.amountUsd)}
                  </span>
                  {position.apyAtEntry !== null && (
                    <span className="text-xs text-white/40">
                      {formatPercent(position.apyAtEntry)} APY at entry
                    </span>
                  )}
                  <button
                    onClick={() => onRemove(position.id)}
                    className="text-xs text-white/40 hover:text-red-400"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
