"use client";

import { formatPercent, formatTokenAmount, formatUsd } from "@/lib/format";
import type { TokenHolding } from "@/types";

type TokenHoldingsTableProps = {
  holdings: TokenHolding[];
  isLoading: boolean;
};

export function TokenHoldingsTable({ holdings, isLoading }: TokenHoldingsTableProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-surface p-6">
      <p className="text-sm font-medium text-white/50">Token holdings</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-white/40">
              <th className="pb-3 font-medium">Token</th>
              <th className="pb-3 font-medium">Balance</th>
              <th className="pb-3 font-medium">Price</th>
              <th className="pb-3 font-medium">24h</th>
              <th className="pb-3 text-right font-medium">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading && holdings.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-white/40">
                  Loading balances…
                </td>
              </tr>
            )}
            {!isLoading && holdings.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-white/40">
                  No Base balances found for this wallet.
                </td>
              </tr>
            )}
            {holdings.map((holding) => (
              <tr key={holding.address}>
                <td className="py-3">
                  <p className="font-medium text-white">{holding.symbol}</p>
                  <p className="text-xs text-white/40">{holding.name}</p>
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
    </div>
  );
}
