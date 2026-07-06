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
import { ExportCsvButton } from "./ExportCsvButton";

function historyCsv(history: NetWorthSnapshot[]): string {
  return toCsv(
    ["date", "wallet_usd", "defi_usd", "total_usd"],
    history.map((s) => [s.date, s.walletUsd, s.defiUsd, s.totalUsd]),
  );
}

export function NetWorthChart({ history }: { history: NetWorthSnapshot[] }) {
  return (
    <div className="h-full rounded-2xl border border-white/10 bg-surface p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-white/50">Net worth history</p>
        <ExportCsvButton
          filenamePrefix="net-worth-history"
          getCsv={() => historyCsv(history)}
          disabled={history.length === 0}
        />
      </div>
      {history.length < 2 ? (
        <div className="flex h-64 items-center justify-center text-center text-sm text-white/40">
          Come back tomorrow — history builds up one snapshot per day as you
          use the tracker.
        </div>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history} margin={{ top: 16, right: 8, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="netWorthFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0052ff" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#0052ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                stroke="rgba(255,255,255,0.3)"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="rgba(255,255,255,0.3)"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: number) => formatUsd(value)}
                width={70}
              />
              <Tooltip
                contentStyle={{
                  background: "#0d0f17",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                }}
                labelStyle={{ color: "rgba(255,255,255,0.6)" }}
                formatter={(value) => formatUsd(Number(value))}
              />
              <Area
                type="monotone"
                dataKey="totalUsd"
                stroke="#0052ff"
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
