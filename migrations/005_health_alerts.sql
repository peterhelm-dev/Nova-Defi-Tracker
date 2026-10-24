-- Optional email alerts for Aave and Compound health factors.
-- No account is required. Apply this before relying on DATABASE_URL for alerts.
-- Upstash Redis is used instead when UPSTASH_REDIS_REST_URL is set.

CREATE TABLE IF NOT EXISTS health_alert_subscriptions (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  address TEXT NOT NULL,
  threshold DOUBLE PRECISION NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'active')),
  confirm_hash TEXT,
  unsub_token TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  confirmed_at BIGINT,
  last_alert_at BIGINT,
  last_confirm_sent_at BIGINT,
  lock_until BIGINT,
  UNIQUE (email, address)
);

CREATE INDEX IF NOT EXISTS health_alert_confirm_hash
  ON health_alert_subscriptions (confirm_hash);

CREATE INDEX IF NOT EXISTS health_alert_unsub_token
  ON health_alert_subscriptions (unsub_token);
