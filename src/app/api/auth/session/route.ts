import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Returns the address of the current session, or null when signed out. */
export async function GET() {
  const store = await cookies();
  const session = verifySessionToken(store.get(SESSION_COOKIE)?.value);
  return NextResponse.json({ address: session?.address ?? null });
}

/** Signs out by clearing the session cookie. */
export async function DELETE() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  return NextResponse.json({ address: null });
}
