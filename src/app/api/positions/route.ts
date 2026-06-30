import { NextResponse } from "next/server";
import { getSessionAddress } from "@/lib/server/auth";
import { getStore } from "@/lib/server/store";
import type { TrackedPosition } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_POSITIONS = 200;

function isPosition(value: unknown): value is TrackedPosition {
  if (typeof value !== "object" || value === null) return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.id === "string" &&
    typeof p.poolId === "string" &&
    typeof p.project === "string" &&
    typeof p.symbol === "string" &&
    typeof p.amountUsd === "number" &&
    (p.apyAtEntry === null || typeof p.apyAtEntry === "number") &&
    typeof p.addedAt === "number"
  );
}

export async function GET() {
  const address = await getSessionAddress();
  if (!address) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const positions = await getStore().getPositions(address);
  return NextResponse.json({ positions });
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

  const raw = (body as { positions?: unknown })?.positions;
  if (!Array.isArray(raw) || !raw.every(isPosition)) {
    return NextResponse.json({ error: "Invalid positions payload" }, { status: 400 });
  }

  // De-dupe by id, newest first, cap length.
  const byId = new Map<string, TrackedPosition>();
  for (const position of raw) byId.set(position.id, position);
  const positions = [...byId.values()]
    .sort((a, b) => b.addedAt - a.addedAt)
    .slice(0, MAX_POSITIONS);

  await getStore().putPositions(address, positions);
  return NextResponse.json({ positions });
}
