import { NextResponse } from "next/server";
import { getHealthAlertStore } from "@/lib/server/healthAlerts";
import { unsubscribeSubscription } from "@/lib/server/healthAlerts/subscribe";
import { clientIp, decideRateLimit } from "@/lib/server/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const decision = await decideRateLimit(clientIp(request), "health-alert-link", 20, 60 * 60 * 1000);
  if (!decision.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again in an hour." },
      { status: 429, headers: { "Retry-After": String(decision.retryAfterSeconds) } },
    );
  }
  const store = getHealthAlertStore();
  if (!store) {
    return NextResponse.json({ error: "Email alerts are coming soon." }, { status: 503 });
  }
  let token = "";
  try {
    const body = (await request.json()) as { token?: unknown };
    token = typeof body.token === "string" ? body.token : "";
  } catch {
    token = "";
  }
  try {
    const outcome = await unsubscribeSubscription(token, store);
    return NextResponse.json({ outcome });
  } catch (error) {
    console.error("Health alert unsubscribe failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ outcome: "invalid" }, { status: 503 });
  }
}
