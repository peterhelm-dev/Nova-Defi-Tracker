"use client";

import { formatChainName, formatRelativeTime, formatTokenAmount, formatUsd } from "@/lib/format";
import { usePrivacyMode, maskValue } from "@/lib/privacy";
import type { ActivityItem } from "@/types";
import { ChainIcon } from "../ChainIcon";

const STATUS_STYLES: Record<string, string> = {
  confirmed: "text-text-muted",
  pending: "text-warning",
  failed: "text-negative",
};

function actionLabel(type: string): string {
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Recent onchain activity — action, timestamp, signed quantity, fiat
 * equivalent, network, status, explorer link, per component-specs. Pending
 * and failed transactions get an explicit status label, not just color, per
 * DESIGN_SPEC.md accessibility rules (never color-only).
 */
export function RecentActivityCard({
  activity,
  isLoading,
  limit,
}: {
  activity: ActivityItem[];
  isLoading: boolean;
  limit?: number;
}) {
  const { privacyMode } = usePrivacyMode();
  const rows = limit ? activity.slice(0, limit) : activity;

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface p-6">
      <p className="text-sm font-medium text-text-secondary">Recent Activity</p>

      {isLoading && rows.length === 0 && (
        <p className="mt-4 text-sm text-text-muted">Loading…</p>
      )}
      {!isLoading && rows.length === 0 && (
        <p className="mt-4 text-sm text-text-muted">No recent activity found.</p>
      )}

      <ul className="mt-4 flex flex-col divide-y divide-border-subtle">
        {rows.map((item) => {
          const primaryTransfer = item.transfers[0];
          const statusClass = STATUS_STYLES[item.status] ?? "text-text-muted";
          return (
            <li key={item.id} className="flex items-center justify-between gap-3 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <ChainIcon chain={item.chain} size={28} />
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">{actionLabel(item.type)}</p>
                  <p className="flex items-center gap-1.5 truncate text-xs text-text-muted">
                    {formatRelativeTime(item.occurredAt)} · {formatChainName(item.chain)}
                    {item.status !== "confirmed" && (
                      <span className={`font-medium capitalize ${statusClass}`}>
                        · {item.status}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {primaryTransfer && (
                  <div className="text-right">
                    <p
                      className={`text-sm tabular-nums ${
                        primaryTransfer.direction === "in" ? "text-positive" : "text-foreground"
                      }`}
                    >
                      {maskValue(
                        `${primaryTransfer.direction === "in" ? "+" : "-"}${formatTokenAmount(
                          primaryTransfer.quantity,
                        )} ${primaryTransfer.symbol}`,
                        privacyMode,
                      )}
                    </p>
                    {primaryTransfer.valueUsd !== null && (
                      <p className="text-xs text-text-muted">
                        {maskValue(formatUsd(primaryTransfer.valueUsd), privacyMode)}
                      </p>
                    )}
                  </div>
                )}
                {item.explorerUrl && (
                  <a
                    href={item.explorerUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-xs text-accent hover:underline"
                    aria-label="View on block explorer"
                  >
                    View
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
