import { sharedPgPool } from "../postgresStore";
import { tokenMatches, type Claim, type HealthAlertStore, type HealthSubscription } from "./store";

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS health_alert_subscriptions (
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
  )`,
  "CREATE INDEX IF NOT EXISTS health_alert_confirm_hash ON health_alert_subscriptions (confirm_hash)",
  "CREATE INDEX IF NOT EXISTS health_alert_unsub_token ON health_alert_subscriptions (unsub_token)",
];

type Row = {
  id: string;
  email: string;
  address: string;
  threshold: number;
  status: "pending" | "active";
  confirm_hash: string | null;
  unsub_token: string;
  created_at: string | number;
  confirmed_at: string | number | null;
  last_alert_at: string | number | null;
  last_confirm_sent_at: string | number | null;
  lock_until: string | number | null;
};

function num(value: string | number | null): number | null {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function fromRow(row: Row): HealthSubscription {
  return {
    id: row.id,
    email: row.email,
    address: row.address,
    threshold: Number(row.threshold),
    status: row.status,
    confirmHash: row.confirm_hash,
    unsubToken: row.unsub_token,
    createdAt: num(row.created_at) ?? 0,
    confirmedAt: num(row.confirmed_at),
    lastAlertAt: num(row.last_alert_at),
    lastConfirmSentAt: num(row.last_confirm_sent_at),
    lockUntil: num(row.lock_until),
  };
}

export function createPostgresHealthAlertStore(connectionString: string): HealthAlertStore {
  let ready: Promise<void> | null = null;
  const pool = () => sharedPgPool(connectionString);

  function ensure(): Promise<void> {
    if (!ready) {
      ready = pool().then(async (db) => {
        for (const statement of SCHEMA) await db.query(statement);
      });
    }
    return ready;
  }

  return {
    async getByPair(email, address) {
      await ensure();
      const db = await pool();
      const { rows } = await db.query<Row>(
        "SELECT * FROM health_alert_subscriptions WHERE email = $1 AND lower(address) = lower($2)",
        [email.trim().toLowerCase(), address],
      );
      return rows[0] ? fromRow(rows[0]) : null;
    },
    async insert(record) {
      await ensure();
      const db = await pool();
      const { rowCount } = await db.query(
        `INSERT INTO health_alert_subscriptions
           (id, email, address, threshold, status, confirm_hash, unsub_token, created_at, confirmed_at, last_alert_at, last_confirm_sent_at, lock_until)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (email, address) DO NOTHING`,
        [
          record.id,
          record.email.trim().toLowerCase(),
          record.address,
          record.threshold,
          record.status,
          record.confirmHash,
          record.unsubToken,
          record.createdAt,
          record.confirmedAt,
          record.lastAlertAt,
          record.lastConfirmSentAt,
          record.lockUntil,
        ],
      );
      return (rowCount ?? 0) > 0;
    },
    async update(record) {
      await ensure();
      const db = await pool();
      await db.query(
        `UPDATE health_alert_subscriptions
            SET email = $2, address = $3, threshold = $4, status = $5, confirm_hash = $6,
                unsub_token = $7, confirmed_at = $8, last_alert_at = $9, last_confirm_sent_at = $10, lock_until = $11
          WHERE id = $1`,
        [
          record.id,
          record.email.trim().toLowerCase(),
          record.address,
          record.threshold,
          record.status,
          record.confirmHash,
          record.unsubToken,
          record.confirmedAt,
          record.lastAlertAt,
          record.lastConfirmSentAt,
          record.lockUntil,
        ],
      );
    },
    async getByConfirmHash(hash) {
      await ensure();
      const db = await pool();
      const { rows } = await db.query<Row>(
        "SELECT * FROM health_alert_subscriptions WHERE confirm_hash = $1 AND status = 'pending'",
        [hash],
      );
      return rows[0] ? fromRow(rows[0]) : null;
    },
    async getByUnsubToken(token) {
      await ensure();
      const db = await pool();
      const { rows } = await db.query<Row>(
        "SELECT * FROM health_alert_subscriptions WHERE unsub_token = $1",
        [token],
      );
      const record = rows[0] ? fromRow(rows[0]) : null;
      if (!record || !tokenMatches(record.unsubToken, token)) return null;
      return record;
    },
    async remove(id) {
      await ensure();
      const db = await pool();
      await db.query("DELETE FROM health_alert_subscriptions WHERE id = $1", [id]);
    },
    async listActive() {
      await ensure();
      const db = await pool();
      const { rows } = await db.query<Row>(
        `SELECT * FROM health_alert_subscriptions
          WHERE status = 'active'
          ORDER BY last_alert_at NULLS FIRST
          LIMIT 500`,
      );
      return rows.map(fromRow);
    },
    async claim(id, now, cooldownMs, lockMs): Promise<Claim | null> {
      await ensure();
      const db = await pool();
      const lockUntil = now + lockMs;
      const { rows } = await db.query<{ id: string }>(
        `UPDATE health_alert_subscriptions
            SET lock_until = $2
          WHERE id = $1
            AND status = 'active'
            AND (lock_until IS NULL OR lock_until < $3)
            AND (last_alert_at IS NULL OR last_alert_at < $4)
          RETURNING id`,
        [id, lockUntil, now, now - cooldownMs],
      );
      return rows[0] ? { lockUntil } : null;
    },
    async commitAlert(id, at, lockUntil) {
      await ensure();
      const db = await pool();
      await db.query(
        `UPDATE health_alert_subscriptions
            SET last_alert_at = $2, lock_until = NULL
          WHERE id = $1 AND lock_until = $3`,
        [id, at, lockUntil],
      );
    },
    async release(id, lockUntil) {
      await ensure();
      const db = await pool();
      await db.query(
        `UPDATE health_alert_subscriptions
            SET lock_until = NULL
          WHERE id = $1 AND lock_until = $2`,
        [id, lockUntil],
      );
    },
  };
}
