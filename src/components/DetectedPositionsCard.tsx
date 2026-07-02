"use client";

import { formatUsd } from "@/lib/format";
import type { DetectedPosition } from "@/types";

/**
 * Lists DeFi positions an indexer detected automatically — LPs, vaults, staked,
 * lending, rewards — that the free manual "Track" flow can't surface.
 */
export function DetectedPositionsCard({
  positions,
}: {
  positions: DetectedPosition[];
}) {
  if (positions.length === 0) return null;

  return (
    <section className="rounded-2xl border border-white/10 bg-surface p-5">
      <h2 className="mb-4 text-sm font-semibold text-white">
        Detected DeFi positions
      </h2>
      <ul className="flex flex-col divide-y divide-white/5">
        {positions.map((position) => (
          <li
            key={position.id}
            className="flex items-center justify-between gap-3 py-2.5"
          >
            <div className="min-w-0">
              <p className="truncate text-sm text-white/90">{position.symbol}</p>
              <p className="truncate text-xs text-white/40">
                {position.protocol ? `${position.protocol} · ` : ""}
                {position.kind} · {position.chain}
              </p>
            </div>
            <span className="shrink-0 text-sm tabular-nums text-white/80">
              {formatUsd(position.valueUsd)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
