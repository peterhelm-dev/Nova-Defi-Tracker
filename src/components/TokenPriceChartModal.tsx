"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTokenPriceHistory } from "@/hooks/useTokenPriceHistory";
import { formatUsd } from "@/lib/format";
import { TokenAvatar } from "./TokenAvatar";

const RANGES: { label: string; days: number }[] = [
  { label: "1D", days: 1 },
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
  { label: "1Y", days: 365 },
];

type TokenPriceChartModalProps = {
  chain: string;
  address: string;
  symbol: string;
  iconUrl: string | null;
  onClose: () => void;
};

/**
 * Price history chart for one token — a line/area chart (not full OHLC
 * candles; see fetchTokenPriceHistory for why). Not a chart of the wallet's
 * specific position value, just the token's market price over time.
 */
export function TokenPriceChartModal({
  chain,
  address,
  symbol,
  iconUrl,
  onClose,
}: TokenPriceChartModalProps) {
  const [days, setDays] = useState(30);
  const { points, available, isLoading } = useTokenPriceHistory(chain, address, days);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const chartData = points.map((p) => ({ t: p.t, price: p.priceUsd }));
  const first = chartData[0]?.price;
  const last = chartData[chartData.length - 1]?.price;
  const changePct = first && last ? ((last - first) / first) * 100 : null;

  const dateFormatter =
    days <= 1
      ? (t: number) => new Date(t).toLocaleTimeString("en-US", { hour: "numeric" })
      : (t: number) => new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${symbol} price chart`}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl border border-white/10 bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <TokenAvatar iconUrl={iconUrl} symbol={symbol} chain={chain} size={28} />
            <div>
              <p className="text-sm font-semibold text-white">{symbol}</p>
              {last !== undefined && (
                <p className="flex items-center gap-2 text-xs">
                  <span className="tabular-nums text-white/70">
                    {formatUsd(last, { decimals: last < 1 ? 4 : 2 })}
                  </span>
                  {changePct !== null && (
                    <span
                      className={changePct >= 0 ? "text-emerald-400" : "text-red-400"}
                    >
                      {changePct >= 0 ? "+" : ""}
                      {changePct.toFixed(2)}%
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-white/40 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 flex gap-1.5">
          {RANGES.map((r) => (
            <button
              key={r.days}
              type="button"
              onClick={() => setDays(r.days)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                days === r.days
                  ? "bg-accent text-white"
                  : "bg-white/5 text-white/50 hover:text-white/80"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="mt-4 h-64 w-full">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-white/40">
              Loading…
            </div>
          ) : !available || chartData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center text-sm text-white/40">
              Price history isn&apos;t available for this token.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="tokenPriceFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c4dff" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#7c4dff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="t"
                  stroke="rgba(255,255,255,0.3)"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={dateFormatter}
                  minTickGap={40}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.3)"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  domain={["auto", "auto"]}
                  tickFormatter={(v: number) => formatUsd(v, { decimals: v < 1 ? 4 : 2 })}
                  width={70}
                />
                <Tooltip
                  contentStyle={{
                    background: "#0d1226",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                  }}
                  labelFormatter={(t) => new Date(Number(t)).toLocaleString("en-US")}
                  labelStyle={{ color: "rgba(255,255,255,0.6)" }}
                  formatter={(value) => formatUsd(Number(value), { decimals: 4 })}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="#7c4dff"
                  strokeWidth={2}
                  fill="url(#tokenPriceFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
        <p className="mt-3 text-xs text-white/30">
          Token market price over time — not the historical USD value of your specific holding.
        </p>
      </div>
    </div>
  );
}
