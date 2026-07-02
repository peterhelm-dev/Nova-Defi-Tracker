import type Stripe from "stripe";
import type { Subscription, SubscriptionStatus } from "@/types";

/**
 * Stripe billing integration (Phase 3). The SDK is loaded lazily so it's only
 * pulled in when Stripe is configured; everything degrades to the free tier
 * otherwise. The Stripe→Subscription mapping is a pure function so it can be
 * unit-tested without the SDK or network.
 */

export function isBillingConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

let stripe: Stripe | null | undefined;

export async function getStripe(): Promise<Stripe | null> {
  if (stripe === undefined) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      stripe = null;
    } else {
      const { default: StripeCtor } = await import("stripe");
      stripe = new StripeCtor(key);
    }
  }
  return stripe;
}

const ENTITLED_STATUSES: SubscriptionStatus[] = ["active", "trialing"];

/** A subscription grants Pro while active or trialing. */
export function isEntitled(subscription: Subscription | null): boolean {
  return !!subscription && ENTITLED_STATUSES.includes(subscription.status);
}

function normalizeStatus(status: string): SubscriptionStatus {
  switch (status) {
    case "active":
    case "trialing":
    case "past_due":
    case "canceled":
      return status;
    case "incomplete":
    case "incomplete_expired":
    case "unpaid":
    case "paused":
      return "past_due";
    default:
      return "none";
  }
}

/** Pure map from a Stripe Subscription to our stored Subscription shape. */
export function subscriptionFromStripe(sub: Stripe.Subscription): Subscription {
  const status = normalizeStatus(sub.status);
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer?.id;

  return {
    plan: status === "canceled" || status === "none" ? "free" : "pro",
    status,
    stripeCustomerId: customerId,
    stripeSubscriptionId: sub.id,
    currentPeriodEnd:
      typeof sub.current_period_end === "number"
        ? sub.current_period_end
        : undefined,
    cancelAtPeriodEnd: sub.cancel_at_period_end ?? undefined,
    updatedAt: Date.now(),
  };
}

/** Subscription representing a user who has never paid. */
export function freeSubscription(): Subscription {
  return { plan: "free", status: "none", updatedAt: Date.now() };
}
