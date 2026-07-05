import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/server/cronAuth";
import { computeWalletUsd } from "@/lib/server/holdings";
import { getStore } from "@/lib/server/store";
import type { Address } from "viem";
import type { NetWorthSnapshot } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Snapshotting every tracked wallet can take a while; give it room.
export const maxDuration = 300;

const MAX_SNAPSHOTS = 180;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Records one net-worth snapshot per tracked wallet for today. Intended to be
 * hit by a daily scheduler (e.g. Vercel Cron — see vercel.json) so history
 * accrues continuously, even when a user hasn't opened the app. Wallet value is
 * recomputed server-side; DeFi value is the sum of the user's tracked
 * positions. Wallets whose prices can't be fetched are skipped so we never
 * persist a misleading $0.
 */
export async function POST(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const store = getStore();
  const users = await store.listUsers();
  const date = todayKey();

  let updated = 0;
  let skipped = 0;

  for (const address of users) {
    const walletUsd = await computeWalletUsd(address as Address);
    if (walletUsd === null) {
      skipped += 1;
      continue;
    }

    const positions = await store.getPositions(address);
    const defiUsd = positions.reduce((sum, p) => sum + p.amountUsd, 0);

    const existing = await store.getSnapshots(address);
    const next: NetWorthSnapshot = {
      date,
      walletUsd,
      defiUsd,
      totalUsd: walletUsd + defiUsd,
    };
    const merged = [...existing.filter((s) => s.date !== date), next]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-MAX_SNAPSHOTS);

    await store.putSnapshots(address, merged);
    updated += 1;
  }

  return NextResponse.json({ date, users: users.length, updated, skipped });
}

// Vercel Cron issues GET requests; accept both.
export const GET = POST;
