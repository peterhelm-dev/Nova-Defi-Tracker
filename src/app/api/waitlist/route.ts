import { NextResponse } from "next/server";
import { getStore } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Intentionally permissive — just enough to reject obvious non-emails.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type WaitlistBody = {
  email?: string;
  ref?: string;
};

/**
 * Phase 0 demand test: capture interest in the paid "Pro" tier. Stored via the
 * shared server store so it lands wherever the store is backed (file today,
 * Postgres in production).
 */
export async function POST(request: Request) {
  let body: WaitlistBody;
  try {
    body = (await request.json()) as WaitlistBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = body.email?.trim() ?? "";
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }

  const ref = typeof body.ref === "string" ? body.ref.slice(0, 120) : undefined;
  await getStore().addWaitlist(email, ref);

  return NextResponse.json({ ok: true });
}
