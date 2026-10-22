"use client";

import { useMemo } from "react";
import {
  allocationFromGroups,
  applyScope,
  groupBalances,
  type BalanceGroup,
  type BalanceViewOptions,
  type DefiSlice,
  type TaggedHolding,
} from "@/lib/balanceView";
import { formatChainName, formatPercent, formatTokenAmount } from "@/lib/format";
import { maskValue, usePrivacyMode } from "@/lib/privacy";
import { useDisplayMoney } from "@/lib/currency";
import { AssetAllocationChart } from "./AssetAllocationChart";
import { ChainIcon } from "./ChainIcon";
import { TokenAvatar } from "./TokenAvatar";

const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "ETH", "BTC"] as const;

function labelFor(group: BalanceGroup, groupBy: BalanceViewOptions["groupBy"]): string {
  return groupBy === "chain" ? formatChainName(group.label) : group.label;
}

export function BalanceBoard({
  holdings,
  defi,
  view,
  onChange,
  showAllocation = false,
  isLoading = false,
}: {
  holdings: TaggedHolding[];
  defi: DefiSlice[];
  view: BalanceViewOptions;
  onChange: (view: BalanceViewOptions) => void;
  showAllocation?: boolean;
  isLoading?: boolean;
}) {
  const { privacyMode } = usePrivacyMode();
  const { currency, setCurrency, formatValue, rates } = useDisplayMoney();
  const scoped = useMemo(() => applyScope(holdings, view.scope), [holdings, view.scope]);
  const groups = useMemo(() => {
    const grouped = groupBalances({
      holdings: scoped,
      defi,
      groupBy: view.groupBy,
      hideDust: view.hideDust,
      sort: view.sort,
    });
    return grouped.map((group) => ({ ...group, label: labelFor(group, view.groupBy) }));
  }, [scoped, defi, view.groupBy, view.hideDust, view.sort]);
  const slices = useMemo(() => allocationFromGroups(groups), [groups]);

  function patch(partial: Partial<BalanceViewOptions>) {
    onChange({ ...view, ...partial });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Select label="Group" value={view.groupBy} onChange={(groupBy) => patch({ groupBy: groupBy as BalanceViewOptions["groupBy"] })} options={[["token", "By token"], ["chain", "By chain"], ["wallet", "By wallet"], ["type", "By type"]]} />
        <Select label="Scope" value={view.scope} onChange={(scope) => patch({ scope: scope as BalanceViewOptions["scope"] })} options={[["combined", "Combined"], ["per-wallet", "Per wallet"]]} />
        <Select label="Sort" value={view.sort} onChange={(sort) => patch({ sort: sort as BalanceViewOptions["sort"] })} options={[["value", "Value"], ["name", "Name"], ["change", "24h change"]]} />
        <Select label="View" value={view.style} onChange={(style) => patch({ style: style as BalanceViewOptions["style"] })} options={[["table", "Table"], ["cards", "Cards"]]} />
        <Select label="Currency" value={currency} onChange={(next) => setCurrency(next as typeof currency)} options={CURRENCIES.map((code) => [code, code])} />
        <button
          type="button"
          aria-pressed={view.hideDust}
          className="layout-chip"
          onClick={() => patch({ hideDust: !view.hideDust })}
        >
          {view.hideDust ? "Showing larger balances" : "Hide dust & spam"}
        </button>
      </div>
      {!rates && currency !== "USD" ? (
        <p className="text-xs text-warning">Live conversion rates are unavailable, so amounts stay in USD.</p>
      ) : null}
      {showAllocation ? <AssetAllocationChart slices={slices} /> : null}
      {groups.length === 0 ? (
        <p className="rounded-2xl border border-border-subtle bg-surface px-4 py-8 text-center text-sm text-text-muted">
          {isLoading ? "Loading balances…" : "Nothing to show with these filters."}
        </p>
      ) : view.style === "cards" ? (
        <div className="flex flex-col gap-5">
          {groups.map((group) => (
            <section key={group.id}>
              <div className="mb-2 flex items-baseline justify-between">
                <h3 className="text-base font-semibold text-foreground">{group.label}</h3>
                <p className="text-sm text-text-secondary">{maskValue(formatValue(group.valueUsd), privacyMode)}</p>
              </div>
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {group.items.map((item) => (
                  <li key={`${item.wallet}-${item.chain}-${item.address}-${item.symbol}`} className="rounded-2xl border border-border-subtle bg-surface p-3">
                    <div className="flex items-center gap-2">
                      <TokenAvatar iconUrl={item.iconUrl} symbol={item.symbol} chain={item.chain} address={item.address} size={28} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{item.symbol}</p>
                        <p className="truncate text-xs text-text-muted">
                          {formatChainName(item.chain)}
                          {view.scope === "per-wallet" ? ` · ${item.wallet}` : ""}
                        </p>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-foreground">{maskValue(formatValue(item.valueUsd), privacyMode)}</p>
                    <p className="text-xs text-text-muted">{formatTokenAmount(item.balance)} · {formatPercent(item.change24h)}</p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border-subtle bg-surface">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead>
              <tr className="text-xs tracking-wide text-text-muted uppercase">
                <th className="px-4 py-3 font-medium">Asset</th>
                <th className="px-4 py-3 font-medium">Balance</th>
                <th className="px-4 py-3 font-medium">24h</th>
                <th className="px-4 py-3 text-right font-medium">Value</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <GroupRows key={group.id} group={group} showWallet={view.scope === "per-wallet"} privacyMode={privacyMode} formatValue={formatValue} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function GroupRows({
  group,
  showWallet,
  privacyMode,
  formatValue,
}: {
  group: BalanceGroup;
  showWallet: boolean;
  privacyMode: boolean;
  formatValue: (usd: number) => string;
}) {
  return (
    <>
      <tr className="bg-background/40">
        <td className="px-4 py-2 font-medium text-foreground" colSpan={3}>
          {group.label}
        </td>
        <td className="px-4 py-2 text-right text-text-secondary">{maskValue(formatValue(group.valueUsd), privacyMode)}</td>
      </tr>
      {group.items.map((item) => (
        <tr key={`${item.wallet}-${item.chain}-${item.address}-${item.symbol}`} className="border-t border-border-subtle">
          <td className="px-4 py-3">
            <span className="flex items-center gap-2">
              <TokenAvatar iconUrl={item.iconUrl} symbol={item.symbol} chain={item.chain} address={item.address} />
              <span>
                <span className="block text-foreground">{item.symbol}</span>
                <span className="flex items-center gap-1 text-xs text-text-muted">
                  <ChainIcon chain={item.chain} size={12} />
                  {formatChainName(item.chain)}
                  {showWallet ? ` · ${item.wallet}` : ""}
                </span>
              </span>
            </span>
          </td>
          <td className="px-4 py-3 text-text-secondary">{formatTokenAmount(item.balance)}</td>
          <td className={`px-4 py-3 ${ (item.change24h ?? 0) >= 0 ? "text-positive" : "text-negative" }`}>{formatPercent(item.change24h)}</td>
          <td className="px-4 py-3 text-right text-foreground">{maskValue(formatValue(item.valueUsd), privacyMode)}</td>
        </tr>
      ))}
    </>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: (string | [string, string])[];
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-text-muted">
      {label}
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-lg border border-border-subtle bg-background px-2 py-1.5 text-sm text-foreground"
      >
        {options.map((option) => {
          const [optionValue, optionLabel] = Array.isArray(option) ? option : [option, option];
          return (
            <option key={optionValue} value={optionValue}>
              {optionLabel}
            </option>
          );
        })}
      </select>
    </label>
  );
}
