"use client";

import Link from "next/link";
import { formatUpdatedAt } from "@/lib/format";
import type { AutoPortfolio } from "@/types";

type Props = {
  isAuthed: boolean;
  configured: boolean;
  entitled: boolean;
  isLoading: boolean;
  portfolio: AutoPortfolio | null;
};

/**
 * Communicates which data mode the dashboard is in: Pro auto-detection
 * (complete + multi-chain) when active, otherwise a slim upsell for it. Keeps
 * the free curated-Base experience clean while making the paid value legible.
 */
export function AutoDetectionBanner({
  isAuthed,
  configured,
  entitled,
  isLoading,
  portfolio,
}: Props) {
  if (portfolio) {
    const chainCount = portfolio.chains.length;
    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-2.5 text-sm">
        <span className="flex items-center gap-1.5 font-medium text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Auto-detected
        </span>
        <span className="text-white/60">
          {portfolio.tokens.length} assets and {portfolio.positions.length} DeFi
          positions across {chainCount} chain{chainCount === 1 ? "" : "s"}
        </span>
        <span className="ml-auto text-xs text-white/40">
          via {portfolio.provider} · updated {formatUpdatedAt(portfolio.updatedAt)}
        </span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-white/10 bg-surface px-4 py-2.5 text-sm text-white/50">
        Detecting your full portfolio…
      </div>
    );
  }

  const message =
    isAuthed && configured && !entitled
      ? "Automatic multi-chain detection is a Pro feature."
      : "Get Pro: automatic detection of every token & DeFi position, across chains.";

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-accent/30 bg-accent/5 px-4 py-2.5 text-sm">
      <span className="text-white/70">{message}</span>
      <Link
        href="/pricing"
        className="ml-auto font-medium text-accent hover:underline"
      >
        See Pro →
      </Link>
    </div>
  );
}
