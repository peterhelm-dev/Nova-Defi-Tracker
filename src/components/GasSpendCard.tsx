"use client";

import { formatChainName, formatUsd } from "@/lib/format";
import type { GasSpendSummary } from "@/types";
import { ChainIcon } from "./ChainIcon";

const ACTION_LABEL: Record<string, string> = {
  transfer: "Transfers",
  approval: "Approvals",
  swap: "Swaps",
  contract: "Other contracts",
  failed: "Failed",
};

type GasSpendCardProps = {
  gas: GasSpendSummary | null;
  isLoading: boolean;
  configured: boolean;
  isError?: boolean;
};

/**
 * Gas the wallet paid. The Alchemy reader covers a recent window per chain,
 * including reverted transactions, and groups the total by chain and action.
 */
export function GasSpendCard({ gas, isLoading, configured, isError }: GasSpendCardProps) {
  return (
    <section className="rounded-2xl border border-border-subtle bg-surface p-5">
      <h2 className="text-sm font-semibold text-foreground">Gas spent</h2>
      <p className="mt-1 text-sm text-text-secondary">
        Fees this wallet paid. A failed transaction still costs gas, so those are included when the receipt says it reverted.
      </p>
      {isLoading ? <p className="mt-4 text-sm text-text-muted">Reading recent transactions…</p> : null}
      {isError ? <p className="mt-4 text-sm text-text-muted">Gas history didn&apos;t load. Try again in a few minutes.</p> : null}
      {!isLoading && !isError && !configured ? (
        <p className="mt-4 text-sm text-text-muted">
          This report uses the same Alchemy key as token balances. It isn&apos;t set in this environment, so the dollar total isn&apos;t available here.
        </p>
      ) : null}
      {!isLoading && configured && gas && gas.txCount === 0 ? (
        <p className="mt-4 text-sm text-text-muted">
          No outgoing transactions showed up in the last {gas.windowDays ?? 30} days. Each chain is capped at 20 recent transfers.
        </p>
      ) : null}
      {!isLoading && gas && gas.txCount > 0 ? (
        <>
          <p className="mt-4 text-2xl font-semibold text-foreground">{formatUsd(gas.totalUsd)}</p>
          <p className="text-xs text-text-muted">
            {gas.txCount} transaction{gas.txCount === 1 ? "" : "s"}
            {gas.oldestMinedAt
              ? ` since ${new Date(gas.oldestMinedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
              : ""}
            {typeof gas.failedTxCount === "number" && gas.failedTxCount > 0
              ? ` · ${gas.failedTxCount} failed`
              : ""}
          </p>
          {gas.partial ? (
            <p className="mt-2 text-xs text-text-muted">
              A chain or a gas-token price was missing, so this dollar total is incomplete.
            </p>
          ) : null}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="text-xs tracking-wide text-text-muted uppercase">By chain</h3>
              <ul className="mt-2 flex flex-col gap-2">
                {[...gas.byChain]
                  .sort((a, b) => b.valueUsd - a.valueUsd)
                  .map((row) => (
                    <li key={row.chain} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-foreground">
                        <ChainIcon chain={row.chain} size={16} />
                        {formatChainName(row.chain)}
                        {row.txCount ? <span className="text-text-muted">· {row.txCount}</span> : null}
                      </span>
                      <span className="tabular-nums text-text-secondary">{formatUsd(row.valueUsd)}</span>
                    </li>
                  ))}
              </ul>
            </div>
            {gas.byAction && gas.byAction.length > 0 ? (
              <div>
                <h3 className="text-xs tracking-wide text-text-muted uppercase">By action</h3>
                <ul className="mt-2 flex flex-col gap-2">
                  {gas.byAction.map((row) => (
                    <li key={row.action} className="flex items-center justify-between text-sm">
                      <span className="text-foreground">
                        {ACTION_LABEL[row.action] ?? row.action}
                        <span className="text-text-muted"> · {row.txCount}</span>
                      </span>
                      <span className="tabular-nums text-text-secondary">{formatUsd(row.valueUsd)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
          <p className="mt-3 text-xs text-text-muted">
            Up to 20 recent outgoing transfers per chain{gas.windowDays ? `, inside ${gas.windowDays} days` : ""}. Cached so this doesn&apos;t rescan on every refresh.
          </p>
        </>
      ) : null}
    </section>
  );
}
