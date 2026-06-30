"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatUsd } from "@/lib/format";
import type { TokenHolding } from "@/types";

const COLORS = [
  "#0052ff",
  "#33c9eb",
  "#7c5cff",
  "#22c55e",
  "#f59e0b",
  "#ec4899",
  "#14b8a6",
  "#a3a3a3",
];

type AssetAllocationChartProps = {
  holdings: TokenHolding[];
  defiUsd: number;
};

export function AssetAllocationChart({
  holdings,
  defiUsd,
}: AssetAllocationChartProps) {
  const slices = [
    ...holdings
      .filter((h) => h.valueUsd > 0)
      .map((h) => ({ name: h.symbol, value: h.valueUsd })),
    ...(defiUsd > 0 ? [{ name: "DeFi positions", value: defiUsd }] : []),
  ].sort((a, b) => b.value - a.value);

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
                    <Cell key={slice.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#0d0f17",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                  }}
                  formatter={(value) => formatUsd(Number(value))}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 flex flex-wrap gap-3 text-xs text-white/60">
            {slices.map((slice, index) => (
              <li key={slice.name} className="flex items-center gap-1.5">
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
