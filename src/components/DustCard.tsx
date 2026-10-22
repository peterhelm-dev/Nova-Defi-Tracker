"use client";

import { useQuery } from "@tanstack/react-query";
import { dustReport, type ChainCost } from "@/lib/dust";
import { formatChainName, formatUsd } from "@/lib/format";
import type { TokenHolding } from "@/types";

export function DustCard({ holdings }: { holdings: TokenHolding[] }) {
  const costs = useQuery({
    queryKey: ["network-costs"],
    enabled: holdings.length > 0,
    staleTime: 120_000,
    queryFn: async () => {
      const res = await fetch("/api/network-costs");
      if (!res.ok) return [] as ChainCost[];
      const json = (await res.json()) as { costs?: ChainCost[] };
      return json.costs ?? [];
    },
  });
  if (holdings.length === 0) return null;
  const report = dustReport(holdings, costs.data ?? []);

  return (
    <section className="rounded-2xl border border-border-subtle bg-surface p-5">
      <h2 className="text-sm font-semibold text-foreground">Dust and idle gas</h2>
      <p className="mt-1 text-sm text-text-secondary">
        A token you cannot move is not really spendable. Costs use the current gas price and a typical transfer.
      </p>
      {costs.isLoading ? <p className="mt-3 text-sm text-text-muted">Checking gas prices…</p> : null}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div>
          <h3 className="text-xs tracking-wide text-text-muted uppercase">Worth less than gas</h3>
          {report.trapped.length === 0 ? (
            <p className="mt-2 text-sm text-text-secondary">Nothing in this view is smaller than a transfer.</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-1 text-sm">
              {report.trapped.slice(0, 8).map((row) => (
                <li key={`${row.chain}:${row.symbol}`} className="flex justify-between gap-3">
                  <span className="text-foreground">{row.symbol} · {formatChainName(row.chain)}</span>
                  <span className="text-text-muted">{formatUsd(row.valueUsd)} vs {formatUsd(row.moveCostUsd)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="text-xs tracking-wide text-text-muted uppercase">Native gas on each chain</h3>
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {report.idle.map((row) => (
              <li key={row.chain} className="flex justify-between gap-3">
                <span className="text-foreground">{formatChainName(row.chain)}</span>
                <span className={row.valueUsd === 0 ? "text-negative" : "text-text-muted"}>{formatUsd(row.valueUsd)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-xs tracking-wide text-text-muted uppercase">No gas to move them</h3>
          {report.stranded.length === 0 ? (
            <p className="mt-2 text-sm text-text-secondary">Every chain with tokens here can pay for a transfer.</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-1 text-sm">
              {report.stranded.slice(0, 8).map((row) => (
                <li key={`${row.chain}:${row.symbol}:stranded`} className="flex justify-between gap-3">
                  <span className="text-foreground">{row.symbol} · {formatChainName(row.chain)}</span>
                  <span className="text-text-muted">{formatUsd(row.valueUsd)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
