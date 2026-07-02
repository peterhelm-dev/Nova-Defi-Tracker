/**
 * Pro-tier entitlement check. This is the seam Phase 3 (billing) fills in:
 * today it reads a static allowlist so the paid path can be exercised, later
 * it becomes a lookup against subscription state (Stripe/webhooks).
 *
 * Behavior:
 * - `PRO_ADDRESSES` set  → only those comma-separated addresses are Pro.
 * - `PRO_ADDRESSES` unset → every signed-in user is treated as Pro, so a
 *   configured indexer is usable in development without a billing system.
 */
export function isPro(address: string): boolean {
  const list = process.env.PRO_ADDRESSES;
  if (!list) return true;
  const allow = list
    .toLowerCase()
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return allow.includes(address.toLowerCase());
}
