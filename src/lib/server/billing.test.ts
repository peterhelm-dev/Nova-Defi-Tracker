import { describe, expect, it } from "vitest";
import type Stripe from "stripe";
import { isEntitled, subscriptionFromStripe } from "./billing";
import type { Subscription } from "@/types";

function stripeSub(overrides: Partial<Stripe.Subscription>): Stripe.Subscription {
  return {
    id: "sub_123",
    customer: "cus_123",
    status: "active",
    current_period_end: 1_800_000_000,
    cancel_at_period_end: false,
    ...overrides,
  } as Stripe.Subscription;
}

describe("subscriptionFromStripe", () => {
  it("maps an active subscription to Pro with entitlement fields", () => {
    const sub = subscriptionFromStripe(stripeSub({}));
    expect(sub).toMatchObject({
      plan: "pro",
      status: "active",
      stripeCustomerId: "cus_123",
      stripeSubscriptionId: "sub_123",
      currentPeriodEnd: 1_800_000_000,
      cancelAtPeriodEnd: false,
    });
  });

  it("reads the customer id from an expanded customer object", () => {
    const sub = subscriptionFromStripe(
      stripeSub({ customer: { id: "cus_expanded" } as Stripe.Customer }),
    );
    expect(sub.stripeCustomerId).toBe("cus_expanded");
  });

  it("maps a canceled subscription back to the free plan", () => {
    const sub = subscriptionFromStripe(stripeSub({ status: "canceled" }));
    expect(sub.plan).toBe("free");
    expect(sub.status).toBe("canceled");
  });

  it("normalizes incomplete/unpaid states to past_due", () => {
    expect(subscriptionFromStripe(stripeSub({ status: "unpaid" })).status).toBe("past_due");
    expect(subscriptionFromStripe(stripeSub({ status: "incomplete" })).status).toBe("past_due");
  });
});

describe("isEntitled", () => {
  const base: Subscription = { plan: "pro", status: "active", updatedAt: 0 };

  it("grants access while active or trialing", () => {
    expect(isEntitled({ ...base, status: "active" })).toBe(true);
    expect(isEntitled({ ...base, status: "trialing" })).toBe(true);
  });

  it("denies access when canceled, past_due, none, or missing", () => {
    expect(isEntitled({ ...base, status: "canceled" })).toBe(false);
    expect(isEntitled({ ...base, status: "past_due" })).toBe(false);
    expect(isEntitled({ ...base, status: "none" })).toBe(false);
    expect(isEntitled(null)).toBe(false);
  });
});
