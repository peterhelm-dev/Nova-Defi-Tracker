import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, subscriptionFromStripe } from "@/lib/server/billing";
import { getStore } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe webhook. The signed cookie can't be trusted here — Stripe calls this
 * server-to-server — so the request is authenticated by verifying the Stripe
 * signature against STRIPE_WEBHOOK_SECRET over the raw body. Subscription
 * lifecycle events are mirrored into our store, which is what entitlement reads.
 */
export async function POST(request: Request) {
  const stripe = await getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Billing is not configured" }, { status: 501 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(payload, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const store = getStore();

  async function persist(sub: Stripe.Subscription, fallbackAddress?: string) {
    const mapped = subscriptionFromStripe(sub);
    const address =
      (sub.metadata?.address as string | undefined) ??
      fallbackAddress ??
      (mapped.stripeCustomerId
        ? await store.getAddressByCustomer(mapped.stripeCustomerId)
        : null);
    if (address) await store.setSubscription(address, mapped);
  }

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await persist(event.data.object as Stripe.Subscription);
      break;

    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.subscription) {
        const sub = await stripe.subscriptions.retrieve(
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id,
        );
        await persist(sub, session.client_reference_id ?? undefined);
      }
      break;
    }

    default:
      // Unhandled event types are acknowledged so Stripe stops retrying.
      break;
  }

  return NextResponse.json({ received: true });
}
