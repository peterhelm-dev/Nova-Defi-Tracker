-- Phase 5 (alerts): user-defined price alerts, evaluated hourly by
-- /api/cron/alerts. Events persist until the user dismisses them in-app.

CREATE TABLE IF NOT EXISTS alert_rules (
  id            TEXT PRIMARY KEY,
  address       TEXT NOT NULL REFERENCES users(address) ON DELETE CASCADE,
  symbol        TEXT NOT NULL,
  token_address TEXT NOT NULL,          -- contract address, or 'native' for ETH
  direction     TEXT NOT NULL,          -- 'above' | 'below'
  threshold_usd DOUBLE PRECISION NOT NULL,
  armed         BOOLEAN NOT NULL,       -- one alert per crossing; see src/lib/alerts.ts
  created_at    BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS alert_rules_address_idx ON alert_rules (address);

CREATE TABLE IF NOT EXISTS alert_events (
  id            TEXT PRIMARY KEY,
  address       TEXT NOT NULL REFERENCES users(address) ON DELETE CASCADE,
  rule_id       TEXT NOT NULL,
  symbol        TEXT NOT NULL,
  direction     TEXT NOT NULL,
  threshold_usd DOUBLE PRECISION NOT NULL,
  price_usd     DOUBLE PRECISION NOT NULL,
  triggered_at  BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS alert_events_address_idx ON alert_events (address);
