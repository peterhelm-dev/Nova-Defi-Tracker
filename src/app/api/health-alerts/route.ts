import { NextResponse } from "next/server";
import { parseAlertAddress, parseAlertEmail, parseAlertThreshold } from "@/lib/healthAlerts/validate";
import { getHealthAlertStore, healthAlertsConfigured } from "@/lib/server/healthAlerts";
import { sendResend } from "@/lib/server/healthAlerts/mailer";
import { requestSubscription } from "@/lib/server/healthAlerts/subscribe";
import { clientIp, decideRateLimit } from "@/lib/server/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { available: healthAlertsConfigured() },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const decision = await decideRateLimit(clientIp(request), "health-alerts", 5, 60 * 60 * 1000);
  if (!decision.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again in an hour." },
      { status: 429, headers: { "Retry-After": String(decision.retryAfterSeconds), "Cache-Control": "no-store" } },
    );
  }
  if (!healthAlertsConfigured()) {
    return NextResponse.json(
      { error: "Email alerts are coming soon.", code: "alerts_unavailable" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter an email, a wallet, and a threshold." }, { status: 400 });
  }
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const email = parseAlertEmail(record.email);
  const address = parseAlertAddress(record.address);
  const threshold = parseAlertThreshold(record.threshold);
  if (!email || !address || threshold === null) {
    return NextResponse.json(
      { error: "Check the email, the wallet address, and a threshold from 1.01 to 10." },
      { status: 400 },
    );
  }

  const store = getHealthAlertStore();
  if (!store) {
    return NextResponse.json({ error: "Email alerts are coming soon.", code: "alerts_unavailable" }, { status: 503 });
  }

  try {
    const result = await requestSubscription(
      { email, address, threshold },
      { now: Date.now(), store, send: sendResend },
    );
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true, alreadyConfirmed: result.alreadyConfirmed });
  } catch (error) {
    console.error("Health alert subscribe failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Alerts are temporarily unavailable." }, { status: 503 });
  }
}
