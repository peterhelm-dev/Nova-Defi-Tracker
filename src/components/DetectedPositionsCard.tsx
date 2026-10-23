"use client";

import { useMemo, useState } from "react";
import { formatChainName, formatUsd } from "@/lib/format";
import { protocolIconUrl } from "@/lib/chainIcons";
import type { DetectedPosition } from "@/types";
import { Badge } from "./Badge";
import { TokenAvatar } from "./TokenAvatar";

type PositionRow =
  | { kind: "single"; id: string; position: DetectedPosition; totalUsd: number }
  | { kind: "pair"; id: string; legs: DetectedPosition[]; totalUsd: number };

/**
 * Reconstructs multi-token positions (e.g. both sides of a liquidity pool)
 * from Zerion's shared `group_id` on each leg — the API returns pool legs as
 * separate line items rather than one combined position. Legs that don't
 * share a group (or have no group) stay as standalone rows.
 */
function groupIntoRows(items: DetectedPosition[]): PositionRow[] {
  const byGroup = new Map<string, DetectedPosition[]>();
  const standalone: DetectedPosition[] = [];

  for (const item of items) {
    if (!item.groupId) {
      standalone.push(item);
      continue;
    }
    byGroup.set(item.groupId, [...(byGroup.get(item.groupId) ?? []), item]);
  }

  const rows: PositionRow[] = [];
  for (const [groupId, legs] of byGroup) {
    if (legs.length < 2) {
      standalone.push(...legs);
      continue;
    }
    rows.push({
      kind: "pair",
      id: groupId,
      legs: [...legs].sort((a, b) => b.valueUsd - a.valueUsd),
      totalUsd: legs.reduce((sum, l) => sum + l.valueUsd, 0),
    });
  }
  for (const position of standalone) {
    rows.push({ kind: "single", id: position.id, position, totalUsd: position.valueUsd });
  }
  return rows;
}

/**
 * Lists DeFi positions an indexer detected automatically — LPs, vaults, staked,
 * lending, rewards, loans — that the free manual "Track" flow can't surface.
 * Grouped by protocol (with a subtotal per group) since a wallet with several
 * positions on the same protocol is easier to scan clustered than flat.
 */
export function DetectedPositionsCard({
  positions,
}: {
  positions: DetectedPosition[];
}) {
  const [protocolFilter, setProtocolFilter] = useState("all");
  const [chainFilter, setChainFilter] = useState("all");
  const [search, setSearch] = useState("");

  const protocols = useMemo(
    () => [...new Set(positions.map((p) => p.protocol).filter((p): p is string => !!p))].sort(),
    [positions],
  );
  const chains = useMemo(
    () => [...new Set(positions.map((p) => p.chain))].sort(),
    [positions],
  );

  const groups = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = positions.filter((p) => {
      if (protocolFilter !== "all" && p.protocol !== protocolFilter) return false;
      if (chainFilter !== "all" && p.chain !== chainFilter) return false;
      if (!query) return true;
      return (
        p.symbol.toLowerCase().includes(query) || p.name.toLowerCase().includes(query)
      );
    });

    const byProtocol = new Map<string, DetectedPosition[]>();
    for (const position of filtered) {
      const key = position.protocol ?? "Other";
      byProtocol.set(key, [...(byProtocol.get(key) ?? []), position]);
    }

    return [...byProtocol.entries()]
      .map(([protocol, items]) => ({
        protocol,
        protocolIconUrl: items.find((p) => p.protocolIconUrl)?.protocolIconUrl ?? protocolIconUrl(protocol),
        healthFactor: items.find((p) => typeof p.healthFactor === "number" && p.healthFactor < 1_000_000)?.healthFactor ?? null,
        rows: groupIntoRows(items).sort((a, b) => b.totalUsd - a.totalUsd),
        totalUsd: items.reduce((sum, p) => sum + p.valueUsd, 0),
      }))
      .sort((a, b) => b.totalUsd - a.totalUsd);
  }, [positions, protocolFilter, chainFilter, search]);

  if (positions.length === 0) return null;

  return (
    <section className="rounded-2xl border border-border-subtle bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">Detected DeFi positions</h2>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            aria-label="Search positions"
            className="rounded-lg border border-border-subtle bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-text-muted focus:border-accent/50 focus:outline-none"
          />
          {protocols.length > 1 && (
            <select
              value={protocolFilter}
              onChange={(e) => setProtocolFilter(e.target.value)}
              aria-label="Filter by protocol"
              className="rounded-lg border border-border-subtle bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-accent/50 focus:outline-none"
            >
              <option value="all">All protocols</option>
              {protocols.map((protocol) => (
                <option key={protocol} value={protocol}>
                  {protocol}
                </option>
              ))}
            </select>
          )}
          {chains.length > 1 && (
            <select
              value={chainFilter}
              onChange={(e) => setChainFilter(e.target.value)}
              aria-label="Filter by chain"
              className="rounded-lg border border-border-subtle bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-accent/50 focus:outline-none"
            >
              <option value="all">All chains</option>
              {chains.map((chain) => (
                <option key={chain} value={chain}>
                  {formatChainName(chain)}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
      {groups.length === 0 ? (
        <p className="py-4 text-center text-sm text-text-muted">
          No positions match your filters.
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map((group) => (
            <div key={group.protocol}>
              <div className="mb-1.5 flex items-center justify-between">
                <Badge label={group.protocol} iconUrl={group.protocolIconUrl} />
                <span className="text-right text-xs font-medium tabular-nums text-text-muted">
                  {typeof group.healthFactor === "number" ? (
                    <span className={group.healthFactor < 1.2 ? "text-negative" : "text-text-secondary"}>
                      Health {group.healthFactor.toFixed(2)}
                    </span>
                  ) : null}{" "}
                  {formatUsd(group.totalUsd)}
                </span>
              </div>
              <ul className="flex flex-col divide-y divide-white/5">
                {group.rows.map((row) =>
                  row.kind === "single" ? (
                    <li
                      key={row.id}
                      className="flex items-center justify-between gap-3 py-2.5"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <TokenAvatar
                          iconUrl={row.position.iconUrl}
                          symbol={row.position.symbol}
                          chain={row.position.chain}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm text-foreground">{row.position.name}</p>
                          <p className="truncate text-xs text-text-muted capitalize">
                            {formatChainName(row.position.chain)}
                            {typeof row.position.amount === "number"
                              ? ` · ${row.position.amount.toLocaleString("en-US", { maximumFractionDigits: 4 })}`
                              : ""}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`shrink-0 text-sm tabular-nums ${row.position.valueUsd < 0 ? "text-negative" : "text-foreground"}`}
                      >
                        {formatUsd(row.position.valueUsd)}
                      </span>
                    </li>
                  ) : (
                    <li key={row.id} className="py-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div className="flex shrink-0 -space-x-2">
                            {row.legs.map((leg) => (
                              <TokenAvatar
                                key={leg.id}
                                iconUrl={leg.iconUrl}
                                symbol={leg.symbol}
                                chain={leg.chain}
                              />
                            ))}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm text-foreground">
                              {row.legs.map((l) => l.symbol).join(" / ")}
                            </p>
                            <p className="truncate text-xs text-text-muted capitalize">
                              {row.legs[0].kind} · liquidity pool
                            </p>
                          </div>
                        </div>
                        <span
                          className={`shrink-0 text-sm tabular-nums ${row.totalUsd < 0 ? "text-negative" : "text-foreground"}`}
                        >
                          {formatUsd(row.totalUsd)}
                        </span>
                      </div>
                      {/* Pair weight bar — how the position's value splits between the two legs. */}
                      <div className="mt-2 flex h-1.5 w-full overflow-hidden rounded-full bg-surface-hover">
                        {row.legs.map((leg, i) => (
                          <span
                            key={leg.id}
                            className={i === 0 ? "bg-accent" : "bg-brand-secondary"}
                            style={{
                              width: `${row.totalUsd > 0 ? (Math.abs(leg.valueUsd) / row.totalUsd) * 100 : 0}%`,
                            }}
                          />
                        ))}
                      </div>
                      <div className="mt-1 flex justify-between text-[11px] text-text-muted">
                        {row.legs.map((leg) => (
                          <span key={leg.id}>
                            {leg.symbol}{" "}
                            {row.totalUsd > 0
                              ? `${((Math.abs(leg.valueUsd) / row.totalUsd) * 100).toFixed(0)}%`
                              : ""}
                          </span>
                        ))}
                      </div>
                    </li>
                  ),
                )}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
