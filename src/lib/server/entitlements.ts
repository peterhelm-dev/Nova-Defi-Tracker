import { isBillingConfigured, isEntitled } from "./billing";
import { getStore } from "./store";

function allowlist(): string[] {
  return (process.env.PRO_ADDRESSES ?? "")
    .toLowerCase()
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * Whether an address is entitled to Pro. This is the seam Phase 2 stubbed and
 * Phase 3 now fills with real billing:
 *
 * - `PRO_ADDRESSES` always wins (comps / team / grandfathering).
 * - Billing configured → entitlement is a live subscription (active/trialing).
 * - Billing NOT configured → dev fallback: everyone is Pro unless
 *   `PRO_ADDRESSES` is set (in which case only the allowlist is).
 */
export async function isEntitledPro(address: string): Promise<boolean> {
  const addr = address.toLowerCase();
  const allow = allowlist();

  if (allow.includes(addr)) return true;

  if (!isBillingConfigured()) {
    return allow.length === 0;
  }

  const subscription = await getStore().getSubscription(addr);
  return isEntitled(subscription);
}
