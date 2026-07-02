import { NextResponse } from "next/server";
import { getSessionAddress } from "@/lib/server/auth";
import { getStripe } from "@/lib/server/billing";
import { getStore } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Opens the Stripe Billing Portal so a subscriber can update payment details or
 * cancel. Requires an existing Stripe customer for the signed-in wallet.
 */
export async function POST(request: Request) {
  const address = await getSessionAddress();
  if (!address) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stripe = await getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Billing is not configured" }, { status: 501 });
  }

  const subscription = await getStore().getSubscription(address);
  if (!subscription?.stripeCustomerId) {
    return NextResponse.json({ error: "No subscription to manage" }, { status: 400 });
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${origin}/pricing`,
  });

  return NextResponse.json({ url: session.url });
}
