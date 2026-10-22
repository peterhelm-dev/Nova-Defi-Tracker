"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatChainName } from "@/lib/format";
import { useDisplayMoney } from "@/lib/currency";
import type { TokenHolding } from "@/types";

const COLORS = [
  "#c4784a",
  "#8fbf98",
  "#e0a36a",
  "#7f9aa8",
  "#d4c4b2",
  "#a66b4a",
  "#6e8f84",
  "#a89888",
];

type Slice = { id: string; name: string; value: number };

type AssetAllocationChartProps = {
  holdings?: TokenHolding[];
  defiUsd?: number;
  /** When set, the chart follows the balance grouping instead of raw holdings. */
  slices?: Slice[];
};

export function AssetAllocationChart({
  holdings = [],
  defiUsd = 0,
  slices: providedSlices,
}: AssetAllocationChartProps) {
  const priced = holdings.filter((holding) => holding.valueUsd > 0);
  const symbolCount = new Map<string, number>();
  for (const holding of priced) {
    symbolCount.set(holding.symbol, (symbolCount.get(holding.symbol) ?? 0) + 1);
  }
  const builtSlices = [
    ...priced.map((holding) => ({
      id: `${holding.chain}:${holding.address}:${holding.symbol}`,
      name:
        (symbolCount.get(holding.symbol) ?? 0) > 1
          ? `${holding.symbol} · ${formatChainName(holding.chain)}`
          : holding.symbol,
      value: holding.valueUsd,
    })),
    ...(defiUsd > 0 ? [{ id: "defi", name: "DeFi positions", value: defiUsd }] : []),
  ].sort((a, b) => b.value - a.value);
  const slices = providedSlices ?? builtSlices;
  const { formatValue } = useDisplayMoney();

  return (
    <div className="rounded-2xl border border-white/10 bg-surface p-6">
      <p className="text-sm font-medium text-white/50">Allocation</p>
      {slices.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-center text-sm text-white/40">
          No priced holdings yet.
        </div>
      ) : (
        <>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {slices.map((slice, index) => (
                    <Cell key={slice.id} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#2a211b",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                  }}
                  formatter={(value) => formatValue(Number(value))}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 flex flex-wrap gap-3 text-xs text-white/60">
            {slices.map((slice, index) => (
              <li key={slice.id} className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: COLORS[index % COLORS.length] }}
                />
                {slice.name}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
