-- Phase 1 schema for the Base Wealth Tracker.
--
-- The shipped default backend is a JSON file store (src/lib/server/store.ts),
-- which is enough for a single-server deployment. For production (serverless
-- or multi-instance), provision Postgres with this schema and implement the
-- UserDataStore interface against it, then return that store from getStore()
-- when DATABASE_URL is set.

-- A user is identified by their wallet address (lower-cased). Auth is via
-- Sign-In With Ethereum; no passwords are stored.
CREATE TABLE IF NOT EXISTS users (
  address     TEXT PRIMARY KEY,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One net-worth snapshot per user per day. A server-side cron can insert rows
-- here so history accrues even when the user isn't visiting.
CREATE TABLE IF NOT EXISTS net_worth_snapshots (
  address     TEXT NOT NULL REFERENCES users(address) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  wallet_usd  DOUBLE PRECISION NOT NULL,
  defi_usd    DOUBLE PRECISION NOT NULL,
  total_usd   DOUBLE PRECISION NOT NULL,
  PRIMARY KEY (address, snapshot_date)
);

-- Manually tracked DeFi pool positions, folded into net worth + allocation.
CREATE TABLE IF NOT EXISTS tracked_positions (
  id           TEXT PRIMARY KEY,
  address      TEXT NOT NULL REFERENCES users(address) ON DELETE CASCADE,
  pool_id      TEXT NOT NULL,
  project      TEXT NOT NULL,
  symbol       TEXT NOT NULL,
  amount_usd   DOUBLE PRECISION NOT NULL,
  apy_at_entry DOUBLE PRECISION,
  added_at     BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS tracked_positions_address_idx
  ON tracked_positions (address);

-- Phase 0 demand-test capture.
CREATE TABLE IF NOT EXISTS waitlist (
  email       TEXT PRIMARY KEY,
  ref         TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
