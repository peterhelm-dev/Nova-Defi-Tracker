import { NextResponse } from "next/server";
import { normalizePreferences } from "@/lib/preferences";
import { getSessionAddress } from "@/lib/server/auth";
import { requireDurableStore } from "@/lib/server/persistence";
import { getStore } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const unavailable = requireDurableStore();
  if (unavailable) return unavailable;

  const address = await getSessionAddress();
  if (!address) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const preferences = normalizePreferences(await getStore().getPreferences(address));
  return NextResponse.json({ preferences });
}

export async function PUT(request: Request) {
  const unavailable = requireDurableStore();
  if (unavailable) return unavailable;

  const address = await getSessionAddress();
  if (!address) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const incoming = (body as { preferences?: unknown })?.preferences;
  if (!incoming || typeof incoming !== "object") {
    return NextResponse.json({ error: "Invalid preferences payload" }, { status: 400 });
  }

  const current = normalizePreferences(await getStore().getPreferences(address));
  const preferences = normalizePreferences({ ...current, ...(incoming as object) });
  await getStore().putPreferences(address, preferences);
  return NextResponse.json({ preferences });
}
