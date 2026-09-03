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
    <div className="rounded-2xl border border-white/10 bg-surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-white/50">Token holdings</p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search token…"
            className="rounded-lg border border-white/10 bg-background px-2.5 py-1.5 text-xs text-white placeholder:text-white/30 focus:border-accent/50 focus:outline-none"
          />
          {chains.length > 1 && (
            <select
              value={chainFilter}
              onChange={(e) => setChainFilter(e.target.value)}
              className="rounded-lg border border-white/10 bg-background px-2.5 py-1.5 text-xs text-white focus:border-accent/50 focus:outline-none"
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
            <tr className="text-xs uppercase tracking-wide text-white/40">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={`pb-3 font-medium ${col.align === "right" ? "text-right" : ""}`}
                >
                  <button
                    type="button"
                    onClick={() => toggleSort(col.key)}
                    className={`inline-flex items-center gap-1 hover:text-white/70 ${sort.key === col.key ? "text-white/70" : ""}`}
                  >
                    {col.label}
                    {sort.key === col.key ? (sort.direction === "asc" ? "↑" : "↓") : ""}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading && holdings.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className="py-6 text-center text-white/40">
                  Loading balances…
                </td>
              </tr>
            )}
            {!isLoading && holdings.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className="py-6 text-center text-white/40">
                  No balances found for this wallet.
                </td>
              </tr>
            )}
            {!isLoading && holdings.length > 0 && visible.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className="py-6 text-center text-white/40">
                  No holdings match your filters.
                </td>
              </tr>
            )}
            {visible.map((holding) => (
              <tr
                key={`${holding.chain}-${holding.address}`}
                onClick={() => setChartHolding(holding)}
                className="cursor-pointer hover:bg-white/[0.03]"
                title={`View ${holding.symbol} price chart`}
              >
                <td className="py-3">
                  <div className="flex items-center gap-2.5">
                    <TokenAvatar
                      iconUrl={holding.iconUrl}
                      symbol={holding.symbol}
                      chain={holding.chain}
                    />
                    <div>
                      <p className="font-medium text-white">{holding.symbol}</p>
                      <p className="text-xs text-white/40">{holding.name}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 whitespace-nowrap text-white/80">
                  {formatTokenAmount(holding.balance)}
                </td>
                <td className="py-3 whitespace-nowrap text-white/80">
                  {holding.priceUsd !== null ? formatUsd(holding.priceUsd, { decimals: 2 }) : "—"}
                </td>
                <td
                  className={
                    holding.change24h === null
                      ? "py-3 whitespace-nowrap text-white/40"
                      : holding.change24h >= 0
                        ? "py-3 whitespace-nowrap text-emerald-400"
                        : "py-3 whitespace-nowrap text-red-400"
                  }
                >
                  {formatPercent(holding.change24h)}
                </td>
                <td className="py-3 whitespace-nowrap text-right font-medium text-white">
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
