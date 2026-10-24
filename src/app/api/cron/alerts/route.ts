import { NextResponse } from "next/server";
import { evaluateAlertRules } from "@/lib/alerts";
import { getHealthAlertStore, healthAlertsConfigured } from "@/lib/server/healthAlerts";
import { evaluateHealthAlerts } from "@/lib/server/healthAlerts/evaluate";
import { sendResend } from "@/lib/server/healthAlerts/mailer";
import { readProtocolHealth } from "@/lib/server/healthAlerts/readHealth";
import { isCronAuthorized } from "@/lib/server/cronAuth";
import { isDurableStoreAvailable } from "@/lib/server/persistence";
import { fetchPrices } from "@/lib/server/prices";
import { getStore } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MAX_EVENTS = 50;

/**
 * Daily sweep (see vercel.json). Hobby allows one run a day, so this route
 * does both the signed-in price alerts and the no-account health-factor emails.
 * Health mail is skipped unless Resend and a durable alert store are set.
 * A second run the same day does not send another health email: each
 * subscription has a 6-day cooldown, and a short lock covers overlapping runs.
 */
export async function POST(request: Request) {
  const priceStore = isDurableStoreAvailable();
  const healthOn = healthAlertsConfigured();
  if (!priceStore && !healthOn) {
    return NextResponse.json({ ok: true, skipped: "no-database" });
  }

  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const price = priceStore ? await runPriceAlerts() : { skipped: "no-database" as const };
  let health: { skipped: "not-configured" } | Awaited<ReturnType<typeof evaluateHealthAlerts>> = {
    skipped: "not-configured",
  };
  if (healthOn) {
    const store = getHealthAlertStore();
    if (store) {
      try {
        health = await evaluateHealthAlerts({
          now: Date.now(),
          store,
          readHealth: readProtocolHealth,
          send: sendResend,
        });
      } catch (error) {
        console.error("Health alert sweep failed", error instanceof Error ? error.message : "unknown");
        return NextResponse.json({ error: "Health alerts failed", price }, { status: 500 });
      }
    }
  }

  if ("error" in price) {
    return NextResponse.json({ error: price.error, health }, { status: 502 });
  }
  return NextResponse.json({ ...price, health });
}

async function runPriceAlerts(): Promise<
  | { users: number; usersWithRules: number; fired: number }
  | { error: string }
  | { skipped: "no-database" }
> {
  const prices = await fetchPrices();
  if (!prices) return { error: "Price provider unavailable" };

  const store = getStore();
  const users = await store.listUsers();
  let usersWithRules = 0;
  let fired = 0;

  for (const address of users) {
    const rules = await store.getAlertRules(address);
    if (rules.length === 0) continue;
    usersWithRules += 1;
    const result = evaluateAlertRules(rules, prices);
    if (result.events.length > 0) {
      const existing = await store.getAlertEvents(address);
      await store.putAlertEvents(address, [...result.events, ...existing].slice(0, MAX_EVENTS));
      fired += result.events.length;
    }
    await store.putAlertRules(address, result.rules);
  }

  return { users: users.length, usersWithRules, fired };
}

// Vercel Cron issues GET requests; accept both.
export const GET = POST;
