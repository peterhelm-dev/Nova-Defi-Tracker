"use client";

import Link from "next/link";
import { formatUpdatedAt } from "@/lib/format";
import type { AutoPortfolio } from "@/types";

type Props = {
  configured: boolean;
  entitled: boolean;
  isLoading: boolean;
  portfolio: AutoPortfolio | null;
};

/**
 * Communicates which data mode the dashboard is in: multi-chain
 * auto-detection (the primary flow, works for any connected wallet) when
 * active, otherwise a slim upsell for it. Keeps the fallback curated-Base
 * experience clean while making the full detection value legible.
 */
export function AutoDetectionBanner({
  configured,
  entitled,
  isLoading,
  portfolio,
}: Props) {
  if (portfolio) {
    const chainCount = portfolio.chains.length;
    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-positive/30 bg-positive/10 px-4 py-2.5 text-sm">
        <span className="flex items-center gap-1.5 font-medium text-positive">
          <span className="h-1.5 w-1.5 rounded-full bg-positive" />
          Auto-detected
        </span>
        <span className="text-text-secondary">
          {portfolio.tokens.length} assets and {portfolio.positions.length} DeFi
          positions across {chainCount} chain{chainCount === 1 ? "" : "s"}
        </span>
        <span className="ml-auto text-xs text-text-muted">
          via {portfolio.provider} · updated {formatUpdatedAt(portfolio.updatedAt)}
        </span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border-subtle bg-surface px-4 py-2.5 text-sm text-text-muted">
        Detecting your full portfolio…
      </div>
    );
  }

  const message =
    configured && !entitled
      ? "Automatic multi-chain detection is a Pro feature."
      : "Get Pro: automatic detection of every token & DeFi position, across chains.";

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-accent/30 bg-accent/5 px-4 py-2.5 text-sm">
      <span className="text-text-secondary">{message}</span>
      <Link
        href="/pricing"
        className="ml-auto font-medium text-accent hover:underline"
      >
        See Pro →
      </Link>
    </div>
  );
}
