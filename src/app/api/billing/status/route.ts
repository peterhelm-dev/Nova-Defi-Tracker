import { NextResponse } from "next/server";
import { getSessionAddress } from "@/lib/server/auth";
import { isBillingConfigured, isEntitled } from "@/lib/server/billing";
import { isEntitledPro } from "@/lib/server/entitlements";
import { getStore } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Billing state for the signed-in wallet, used to render the right CTA
 * (upgrade / manage / waitlist). `entitled` is the authoritative access flag
 * (covers comp allowlist and dev fallback), while `hasCustomer` tells the UI
 * whether a Stripe portal is available.
 */
export async function GET() {
  const address = await getSessionAddress();
  if (!address) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const configured = isBillingConfigured();
  const subscription = await getStore().getSubscription(address);
  const entitled = await isEntitledPro(address);

  return NextResponse.json({
    configured,
    entitled,
    plan: entitled ? "pro" : subscription?.plan ?? "free",
    status: subscription?.status ?? "none",
    currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
    // A portal is only usable once Stripe has a customer and a real subscription.
    hasSubscription: isEntitled(subscription) || subscription?.status === "past_due",
  });
}
