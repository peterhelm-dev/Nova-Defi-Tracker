"use client";

import { useMemo, useState } from "react";
import { toCsv } from "@/lib/csv";
import {
  formatChainName,
  formatPercent,
  formatTokenAmount,
  formatUsd,
} from "@/lib/format";
import type { TokenHolding } from "@/types";
import { ExportCsvButton } from "./ExportCsvButton";
import { TokenAvatar } from "./TokenAvatar";
import { TokenPriceChartModal } from "./TokenPriceChartModal";

type TokenHoldingsTableProps = {
  holdings: TokenHolding[];
  isLoading: boolean;
};

type SortKey = "token" | "balance" | "price" | "change24h" | "value";
type SortState = { key: SortKey; direction: "asc" | "desc" };

const COLUMNS: { key: SortKey; label: string; align?: "right" }[] = [
  { key: "token", label: "Token" },
  { key: "balance", label: "Balance" },
  { key: "price", label: "Price" },
  { key: "change24h", label: "24h" },
  { key: "value", label: "Value", align: "right" },
];

function sortValue(holding: TokenHolding, key: SortKey): number | string {
  switch (key) {
    case "token":
      return holding.symbol.toLowerCase();
    case "balance":
      return holding.balance;
    case "price":
      return holding.priceUsd ?? -Infinity;
    case "change24h":
      return holding.change24h ?? -Infinity;
    case "value":
      return holding.valueUsd;
  }
}

function holdingsCsv(holdings: TokenHolding[]): string {
  return toCsv(
    ["symbol", "name", "chain", "address", "balance", "price_usd", "change_24h_pct", "value_usd"],
    holdings.map((h) => [
      h.symbol,
      h.name,
      h.chain,
      h.address,
      h.balance,
      h.priceUsd,
      h.change24h,
      h.valueUsd,
    ]),
  );
}

export function TokenHoldingsTable({ holdings, isLoading }: TokenHoldingsTableProps) {
  const [sort, setSort] = useState<SortState>({ key: "value", direction: "desc" });
  const [chainFilter, setChainFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [chartHolding, setChartHolding] = useState<TokenHolding | null>(null);

  const chains = useMemo(
    () => [...new Set(holdings.map((h) => h.chain))].sort(),
    [holdings],
  );

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = holdings.filter((h) => {
      if (chainFilter !== "all" && h.chain !== chainFilter) return false;
      if (!query) return true;
      return (
        h.symbol.toLowerCase().includes(query) || h.name.toLowerCase().includes(query)
      );
    });

    const dir = sort.direction === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = sortValue(a, sort.key);
      const bv = sortValue(b, sort.key);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [holdings, chainFilter, search, sort]);

  function toggleSort(key: SortKey) {
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "desc" },
    );
  }

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-text-muted">Token holdings</p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search token…"
            aria-label="Search tokens"
            className="rounded-lg border border-border-subtle bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-text-muted focus:border-accent/50 focus:outline-none"
          />
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
          <ExportCsvButton
            filenamePrefix="holdings"
            getCsv={() => holdingsCsv(holdings)}
            disabled={holdings.length === 0}
          />
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-text-muted">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={`pb-3 font-medium ${col.align === "right" ? "text-right" : ""}`}
                >
                  <button
                    type="button"
                    onClick={() => toggleSort(col.key)}
                    className={`inline-flex items-center gap-1 hover:text-foreground ${sort.key === col.key ? "text-text-secondary" : ""}`}
                  >
                    {col.label}
                    {sort.key === col.key ? (sort.direction === "asc" ? "↑" : "↓") : ""}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {isLoading && holdings.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className="py-6 text-center text-text-muted">
                  Loading balances…
                </td>
              </tr>
            )}
            {!isLoading && holdings.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className="py-6 text-center text-text-muted">
                  No balances found for this wallet.
                </td>
              </tr>
            )}
            {!isLoading && holdings.length > 0 && visible.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className="py-6 text-center text-text-muted">
                  No holdings match your filters.
                </td>
              </tr>
            )}
            {visible.map((holding) => (
              <tr
                key={`${holding.chain}-${holding.address}`}
                onClick={() => setChartHolding(holding)}
                className="cursor-pointer hover:bg-surface-hover"
                title={`View ${holding.symbol} price chart`}
              >
                <td className="py-3">
                  <div className="flex items-center gap-2.5">
                    <TokenAvatar
                      iconUrl={holding.iconUrl}
                      symbol={holding.symbol}
                      chain={holding.chain}
                      address={holding.address}
                    />
                    <div>
                      <p className="font-medium text-foreground">{holding.symbol}</p>
                      <p className="text-xs text-text-muted">{holding.name}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 whitespace-nowrap text-foreground">
                  {formatTokenAmount(holding.balance)}
                </td>
                <td className="py-3 whitespace-nowrap text-foreground">
                  {holding.priceUsd !== null ? formatUsd(holding.priceUsd, { decimals: 2 }) : "Price unavailable"}
                </td>
                <td
                  className={
                    holding.change24h === null
                      ? "py-3 whitespace-nowrap text-text-muted"
                      : holding.change24h >= 0
                        ? "py-3 whitespace-nowrap text-positive"
                        : "py-3 whitespace-nowrap text-negative"
                  }
                >
                  {formatPercent(holding.change24h)}
                </td>
                <td className="py-3 whitespace-nowrap text-right font-medium text-foreground">
                  {formatUsd(holding.valueUsd)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {chartHolding && (
        <TokenPriceChartModal
          chain={chartHolding.chain}
          address={chartHolding.address}
          symbol={chartHolding.symbol}
          iconUrl={chartHolding.iconUrl}
          onClose={() => setChartHolding(null)}
        />
      )}
    </div>
  );
}
