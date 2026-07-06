import { NextResponse } from "next/server";
import { getSessionAddress } from "@/lib/server/auth";
import { getStore } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Dismisses one fired alert (or all of them when eventId is omitted). */
export async function POST(request: Request) {
  const address = await getSessionAddress();
  if (!address) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let eventId: string | undefined;
  try {
    const body = (await request.json()) as { eventId?: string };
    eventId = body.eventId;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const store = getStore();
  const events = await store.getAlertEvents(address);
  const remaining = eventId ? events.filter((e) => e.id !== eventId) : [];
  await store.putAlertEvents(address, remaining);

  return NextResponse.json({ events: remaining });
}
