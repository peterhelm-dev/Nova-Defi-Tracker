import type { Pool } from "pg";
import type { NetWorthSnapshot, Subscription, TrackedPosition } from "@/types";
import type { UserDataStore } from "./store";

/**
 * Production `UserDataStore` backed by Postgres (schema in
 * migrations/001_init.sql). Safe across serverless / multiple instances, which
 * the file store is not. The `pg` driver is imported lazily so it's only loaded
 * when `DATABASE_URL` is configured.
 */
export class PostgresStore implements UserDataStore {
  private poolPromise: Promise<Pool> | undefined;

  constructor(private readonly connectionString: string) {}

  private pool(): Promise<Pool> {
    if (!this.poolPromise) {
      this.poolPromise = import("pg").then(({ default: pg }) => {
        const pool = new pg.Pool({ connectionString: this.connectionString });
        return pool;
      });
    }
    return this.poolPromise;
  }

  private async ensureUser(address: string): Promise<void> {
    const pool = await this.pool();
    await pool.query(
      "INSERT INTO users (address) VALUES ($1) ON CONFLICT (address) DO NOTHING",
      [address.toLowerCase()],
    );
  }

  async getSnapshots(address: string): Promise<NetWorthSnapshot[]> {
    const pool = await this.pool();
    const { rows } = await pool.query(
      `SELECT to_char(snapshot_date, 'YYYY-MM-DD') AS date,
              wallet_usd AS "walletUsd", defi_usd AS "defiUsd", total_usd AS "totalUsd"
         FROM net_worth_snapshots
        WHERE address = $1
        ORDER BY snapshot_date ASC`,
      [address.toLowerCase()],
    );
    return rows as NetWorthSnapshot[];
  }

  async putSnapshots(address: string, snapshots: NetWorthSnapshot[]): Promise<void> {
    const key = address.toLowerCase();
    await this.ensureUser(key);
    const pool = await this.pool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM net_worth_snapshots WHERE address = $1", [key]);
      for (const s of snapshots) {
        await client.query(
          `INSERT INTO net_worth_snapshots
             (address, snapshot_date, wallet_usd, defi_usd, total_usd)
           VALUES ($1, $2, $3, $4, $5)`,
          [key, s.date, s.walletUsd, s.defiUsd, s.totalUsd],
        );
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async getPositions(address: string): Promise<TrackedPosition[]> {
    const pool = await this.pool();
    const { rows } = await pool.query(
      `SELECT id, pool_id AS "poolId", project, symbol,
              amount_usd AS "amountUsd", apy_at_entry AS "apyAtEntry", added_at AS "addedAt"
         FROM tracked_positions
        WHERE address = $1
        ORDER BY added_at DESC`,
      [address.toLowerCase()],
    );
    // added_at is a BIGINT — pg returns it as a string; coerce back to number.
    return rows.map((r) => ({ ...r, addedAt: Number(r.addedAt) })) as TrackedPosition[];
  }

  async putPositions(address: string, positions: TrackedPosition[]): Promise<void> {
    const key = address.toLowerCase();
    await this.ensureUser(key);
    const pool = await this.pool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM tracked_positions WHERE address = $1", [key]);
      for (const p of positions) {
        await client.query(
          `INSERT INTO tracked_positions
             (id, address, pool_id, project, symbol, amount_usd, apy_at_entry, added_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [p.id, key, p.poolId, p.project, p.symbol, p.amountUsd, p.apyAtEntry, p.addedAt],
        );
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async addWaitlist(email: string, ref?: string): Promise<void> {
    const pool = await this.pool();
    await pool.query(
      `INSERT INTO waitlist (email, ref) VALUES ($1, $2)
       ON CONFLICT (email) DO NOTHING`,
      [email.trim().toLowerCase(), ref ?? null],
    );
  }

  async listUsers(): Promise<string[]> {
    const pool = await this.pool();
    const { rows } = await pool.query("SELECT address FROM users");
    return rows.map((r) => r.address as string);
  }

  async getSubscription(address: string): Promise<Subscription | null> {
    const pool = await this.pool();
    const { rows } = await pool.query(
      `SELECT plan, status,
              stripe_customer_id AS "stripeCustomerId",
              stripe_subscription_id AS "stripeSubscriptionId",
              current_period_end AS "currentPeriodEnd",
              cancel_at_period_end AS "cancelAtPeriodEnd",
              updated_at AS "updatedAt"
         FROM subscriptions
        WHERE address = $1`,
      [address.toLowerCase()],
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      plan: r.plan,
      status: r.status,
      stripeCustomerId: r.stripeCustomerId ?? undefined,
      stripeSubscriptionId: r.stripeSubscriptionId ?? undefined,
      currentPeriodEnd: r.currentPeriodEnd == null ? undefined : Number(r.currentPeriodEnd),
      cancelAtPeriodEnd: r.cancelAtPeriodEnd ?? undefined,
      updatedAt: Number(r.updatedAt),
    };
  }

  async setSubscription(address: string, s: Subscription): Promise<void> {
    const key = address.toLowerCase();
    await this.ensureUser(key);
    const pool = await this.pool();
    await pool.query(
      `INSERT INTO subscriptions
         (address, plan, status, stripe_customer_id, stripe_subscription_id,
          current_period_end, cancel_at_period_end, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (address) DO UPDATE SET
         plan = EXCLUDED.plan,
         status = EXCLUDED.status,
         stripe_customer_id = EXCLUDED.stripe_customer_id,
         stripe_subscription_id = EXCLUDED.stripe_subscription_id,
         current_period_end = EXCLUDED.current_period_end,
         cancel_at_period_end = EXCLUDED.cancel_at_period_end,
         updated_at = EXCLUDED.updated_at`,
      [
        key,
        s.plan,
        s.status,
        s.stripeCustomerId ?? null,
        s.stripeSubscriptionId ?? null,
        s.currentPeriodEnd ?? null,
        s.cancelAtPeriodEnd ?? null,
        s.updatedAt,
      ],
    );
  }

  async getAddressByCustomer(customerId: string): Promise<string | null> {
    const pool = await this.pool();
    const { rows } = await pool.query(
      "SELECT address FROM subscriptions WHERE stripe_customer_id = $1",
      [customerId],
    );
    return rows.length > 0 ? (rows[0].address as string) : null;
  }
}
