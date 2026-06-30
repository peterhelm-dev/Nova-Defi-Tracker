import { NextResponse } from "next/server";
import { getSessionAddress } from "@/lib/server/auth";
import { getStore } from "@/lib/server/store";
import type { NetWorthSnapshot } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SNAPSHOTS = 180;

function isSnapshot(value: unknown): value is NetWorthSnapshot {
  if (typeof value !== "object" || value === null) return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.date === "string" &&
    typeof s.walletUsd === "number" &&
    typeof s.defiUsd === "number" &&
    typeof s.totalUsd === "number"
  );
}

export async function GET() {
  const address = await getSessionAddress();
  if (!address) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const snapshots = await getStore().getSnapshots(address);
  return NextResponse.json({ snapshots });
}

export async function PUT(request: Request) {
  const address = await getSessionAddress();
  if (!address) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const raw = (body as { snapshots?: unknown })?.snapshots;
  if (!Array.isArray(raw) || !raw.every(isSnapshot)) {
    return NextResponse.json({ error: "Invalid snapshots payload" }, { status: 400 });
  }

  // De-dupe by date, keep chronological order, cap length.
  const byDate = new Map<string, NetWorthSnapshot>();
  for (const snapshot of raw) byDate.set(snapshot.date, snapshot);
  const snapshots = [...byDate.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-MAX_SNAPSHOTS);

  await getStore().putSnapshots(address, snapshots);
  return NextResponse.json({ snapshots });
}
