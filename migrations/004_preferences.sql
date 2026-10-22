-- Dashboard layout, balance view, and research watchlist.
-- Synced only when the visitor is signed in and DATABASE_URL is set.
-- Guest mode keeps the same document in localStorage.

CREATE TABLE IF NOT EXISTS user_preferences (
  address TEXT PRIMARY KEY REFERENCES users(address) ON DELETE CASCADE,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb
);
