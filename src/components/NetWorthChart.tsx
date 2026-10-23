"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toCsv } from "@/lib/csv";
import { formatUsd } from "@/lib/format";
import type { NetWorthSnapshot } from "@/types";
import { chartTooltipStyle } from "@/lib/themes";
import { ExportCsvButton } from "./ExportCsvButton";

function historyCsv(history: NetWorthSnapshot[]): string {
  return toCsv(
    ["date", "wallet_usd", "defi_usd", "total_usd"],
    history.map((s) => [s.date, s.walletUsd, s.defiUsd, s.totalUsd]),
  );
}

export function NetWorthChart({ history }: { history: NetWorthSnapshot[] }) {
  return (
    <div className="h-full rounded-2xl border border-border-subtle bg-surface p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-text-muted">Net worth history</p>
        <ExportCsvButton
          filenamePrefix="net-worth-history"
          getCsv={() => historyCsv(history)}
          disabled={history.length === 0}
        />
      </div>
      {history.length < 2 ? (
        <div className="flex h-64 items-center justify-center text-center text-sm text-text-muted">
          Come back tomorrow — history builds up one snapshot per day as you
          use the tracker.
        </div>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history} margin={{ top: 16, right: 8, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="netWorthFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                stroke="var(--text-muted)"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="var(--text-muted)"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: number) => formatUsd(value)}
                width={70}
              />
              <Tooltip
                contentStyle={chartTooltipStyle}
                labelStyle={{ color: "var(--text-secondary)" }}
                formatter={(value) => formatUsd(Number(value))}
              />
              <Area
                type="monotone"
                dataKey="totalUsd"
                stroke="var(--accent)"
                strokeWidth={2}
                fill="url(#netWorthFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
