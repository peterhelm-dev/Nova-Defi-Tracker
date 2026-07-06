import { NextResponse } from "next/server";
import { getSessionAddress } from "@/lib/server/auth";
import { getStore } from "@/lib/server/store";
import type { AlertRule } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_RULES = 50;

function isRule(value: unknown): value is AlertRule {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    typeof r.symbol === "string" &&
    typeof r.tokenAddress === "string" &&
    (r.direction === "above" || r.direction === "below") &&
    typeof r.thresholdUsd === "number" &&
    Number.isFinite(r.thresholdUsd) &&
    r.thresholdUsd > 0 &&
    typeof r.armed === "boolean" &&
    typeof r.createdAt === "number"
  );
}

/** Rules plus any fired-and-undismissed events for the signed-in wallet. */
export async function GET() {
  const address = await getSessionAddress();
  if (!address) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const store = getStore();
  const [rules, events] = await Promise.all([
    store.getAlertRules(address),
    store.getAlertEvents(address),
  ]);
  return NextResponse.json({ rules, events });
}

/** Replaces the rule set (same replace-style contract as positions). */
export async function PUT(request: Request) {
  const address = await getSessionAddress();
  if (!address) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const raw = (body as { rules?: unknown })?.rules;
  if (!Array.isArray(raw) || !raw.every(isRule)) {
    return NextResponse.json({ error: "Invalid rules payload" }, { status: 400 });
  }

  const byId = new Map<string, AlertRule>();
  for (const rule of raw) byId.set(rule.id, rule);
  const rules = [...byId.values()]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, MAX_RULES);

  await getStore().putAlertRules(address, rules);
  return NextResponse.json({ rules });
}
