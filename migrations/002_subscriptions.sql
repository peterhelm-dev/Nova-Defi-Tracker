-- Phase 3 (billing): subscription state mirrored from Stripe by the webhook.
-- Entitlement (Pro access) is derived from this table server-side.

CREATE TABLE IF NOT EXISTS subscriptions (
  address                TEXT PRIMARY KEY REFERENCES users(address) ON DELETE CASCADE,
  plan                   TEXT NOT NULL DEFAULT 'free',
  status                 TEXT NOT NULL DEFAULT 'none',
  stripe_customer_id     TEXT UNIQUE,
  stripe_subscription_id TEXT,
  current_period_end     BIGINT,
  cancel_at_period_end   BOOLEAN,
  updated_at             BIGINT NOT NULL
);

-- Webhooks reference the Stripe customer; index the reverse lookup.
CREATE INDEX IF NOT EXISTS subscriptions_customer_idx
  ON subscriptions (stripe_customer_id);
