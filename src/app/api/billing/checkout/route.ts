import { NextResponse } from "next/server";
import { getSessionAddress } from "@/lib/server/auth";
import { getStripe } from "@/lib/server/billing";
import { getStore } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Starts a Stripe Checkout session to subscribe the signed-in wallet to Pro.
 * Reuses (or creates) a Stripe customer tagged with the wallet address so
 * later webhook events map back to the right account. Returns a redirect URL.
 */
export async function POST(request: Request) {
  const address = await getSessionAddress();
  if (!address) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stripe = await getStripe();
  const priceId = process.env.STRIPE_PRO_PRICE_ID;
  if (!stripe || !priceId) {
    return NextResponse.json({ error: "Billing is not configured" }, { status: 501 });
  }

  const store = getStore();
  const existing = await store.getSubscription(address);

  let customerId = existing?.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({ metadata: { address } });
    customerId = customer.id;
    // Persist the mapping now so the webhook can resolve customer → address.
    await store.setSubscription(address, {
      plan: "free",
      status: "none",
      stripeCustomerId: customerId,
      updatedAt: Date.now(),
    });
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: address,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: { metadata: { address } },
    success_url: `${origin}/pricing?upgraded=1`,
    cancel_url: `${origin}/pricing`,
  });

  return NextResponse.json({ url: session.url });
}
