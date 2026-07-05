import { NextResponse } from "next/server";
import { evaluateAlertRules } from "@/lib/alerts";
import { isCronAuthorized } from "@/lib/server/cronAuth";
import { fetchPrices } from "@/lib/server/prices";
import { getStore } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MAX_EVENTS = 50;

/**
 * Hourly price-alert sweep (see vercel.json). Fetches prices once, then
 * evaluates every user's rules with fire/disarm/re-arm semantics. Fired events
 * are stored for in-app display until dismissed — this is the delivery channel
 * for now; an email/push channel can be added behind the same evaluation.
 */
export async function POST(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prices = await fetchPrices();
  if (!prices) {
    // No prices — leave all rules untouched rather than mis-evaluate.
    return NextResponse.json(
      { error: "Price provider unavailable" },
      { status: 502 },
    );
  }

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
      await store.putAlertEvents(
        address,
        [...result.events, ...existing].slice(0, MAX_EVENTS),
      );
      fired += result.events.length;
    }
    await store.putAlertRules(address, result.rules);
  }

  return NextResponse.json({ users: users.length, usersWithRules, fired });
}

// Vercel Cron issues GET requests; accept both.
export const GET = POST;
