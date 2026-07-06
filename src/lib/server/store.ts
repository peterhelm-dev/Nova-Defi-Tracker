import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type {
  AlertEvent,
  AlertRule,
  NetWorthSnapshot,
  Subscription,
  TrackedPosition,
} from "@/types";
import { PostgresStore } from "./postgresStore";

/**
 * Server-side persistence for Phase 1.
 *
 * `UserDataStore` is the seam between the app and whatever durable backend you
 * run. The shipped default (`FileStore`) writes JSON to a local data dir so a
 * single Next server keeps user data across restarts and serves it to any
 * device — proving out the "data survives a cache clear and syncs across
 * devices" goal without external infra.
 *
 * For production (serverless / multi-instance), implement this same interface
 * against Postgres — the schema is in `migrations/001_init.sql` — and return
 * it from `getStore()` when `DATABASE_URL` is set. The route handlers and
 * client never change.
 */
export interface UserDataStore {
  getSnapshots(address: string): Promise<NetWorthSnapshot[]>;
  putSnapshots(address: string, snapshots: NetWorthSnapshot[]): Promise<void>;
  getPositions(address: string): Promise<TrackedPosition[]>;
  putPositions(address: string, positions: TrackedPosition[]): Promise<void>;
  addWaitlist(email: string, ref?: string): Promise<void>;
  /** Addresses with any stored data — drives the scheduled snapshot job. */
  listUsers(): Promise<string[]>;
  getSubscription(address: string): Promise<Subscription | null>;
  setSubscription(address: string, subscription: Subscription): Promise<void>;
  /** Reverse lookup for webhooks, which reference a Stripe customer, not us. */
  getAddressByCustomer(customerId: string): Promise<string | null>;
  getAlertRules(address: string): Promise<AlertRule[]>;
  putAlertRules(address: string, rules: AlertRule[]): Promise<void>;
  getAlertEvents(address: string): Promise<AlertEvent[]>;
  putAlertEvents(address: string, events: AlertEvent[]): Promise<void>;
}

type Persisted = {
  snapshots: Record<string, NetWorthSnapshot[]>;
  positions: Record<string, TrackedPosition[]>;
  waitlist: { email: string; ref?: string; at: number }[];
  subscriptions: Record<string, Subscription>;
  customerAddress: Record<string, string>;
  alertRules: Record<string, AlertRule[]>;
  alertEvents: Record<string, AlertEvent[]>;
};

const EMPTY: Persisted = {
  snapshots: {},
  positions: {},
  waitlist: [],
  subscriptions: {},
  customerAddress: {},
  alertRules: {},
  alertEvents: {},
};

function key(address: string): string {
  return address.toLowerCase();
}

/**
 * JSON-file-backed store. Reads once into memory, then mirrors every write to
 * disk. Writes are serialized through a promise chain so concurrent requests
 * don't clobber the file. Falls back to memory-only if the data dir isn't
 * writable (e.g. a read-only serverless FS) so the app never crashes.
 */
class FileStore implements UserDataStore {
  private data: Persisted = structuredClone(EMPTY);
  private loaded = false;
  private diskOk = true;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly file: string) {}

  private async load(): Promise<void> {
    if (this.loaded) return;
    try {
      const raw = await readFile(this.file, "utf8");
      this.data = { ...structuredClone(EMPTY), ...(JSON.parse(raw) as Persisted) };
    } catch {
      // No file yet (first run) or unreadable — start empty.
      this.data = structuredClone(EMPTY);
    }
    this.loaded = true;
  }

  private async flush(): Promise<void> {
    if (!this.diskOk) return;
    const snapshot = JSON.stringify(this.data);
    this.queue = this.queue
      .then(async () => {
        await mkdir(dirname(this.file), { recursive: true });
        await writeFile(this.file, snapshot, "utf8");
      })
      .catch(() => {
        // Disk became unavailable — degrade to memory-only rather than throw.
        this.diskOk = false;
      });
    await this.queue;
  }

  async getSnapshots(address: string): Promise<NetWorthSnapshot[]> {
    await this.load();
    return this.data.snapshots[key(address)] ?? [];
  }

  async putSnapshots(address: string, snapshots: NetWorthSnapshot[]): Promise<void> {
    await this.load();
    this.data.snapshots[key(address)] = snapshots;
    await this.flush();
  }

  async getPositions(address: string): Promise<TrackedPosition[]> {
    await this.load();
    return this.data.positions[key(address)] ?? [];
  }

  async putPositions(address: string, positions: TrackedPosition[]): Promise<void> {
    await this.load();
    this.data.positions[key(address)] = positions;
    await this.flush();
  }

  async addWaitlist(email: string, ref?: string): Promise<void> {
    await this.load();
    const normalized = email.trim().toLowerCase();
    if (!this.data.waitlist.some((e) => e.email === normalized)) {
      this.data.waitlist.push({ email: normalized, ref, at: Date.now() });
      await this.flush();
    }
  }

  async listUsers(): Promise<string[]> {
    await this.load();
    return [
      ...new Set([
        ...Object.keys(this.data.snapshots),
        ...Object.keys(this.data.positions),
      ]),
    ];
  }

  async getSubscription(address: string): Promise<Subscription | null> {
    await this.load();
    return this.data.subscriptions[key(address)] ?? null;
  }

  async setSubscription(address: string, subscription: Subscription): Promise<void> {
    await this.load();
    const addr = key(address);
    this.data.subscriptions[addr] = subscription;
    if (subscription.stripeCustomerId) {
      this.data.customerAddress[subscription.stripeCustomerId] = addr;
    }
    await this.flush();
  }

  async getAddressByCustomer(customerId: string): Promise<string | null> {
    await this.load();
    return this.data.customerAddress[customerId] ?? null;
  }

  async getAlertRules(address: string): Promise<AlertRule[]> {
    await this.load();
    return this.data.alertRules[key(address)] ?? [];
  }

  async putAlertRules(address: string, rules: AlertRule[]): Promise<void> {
    await this.load();
    this.data.alertRules[key(address)] = rules;
    await this.flush();
  }

  async getAlertEvents(address: string): Promise<AlertEvent[]> {
    await this.load();
    return this.data.alertEvents[key(address)] ?? [];
  }

  async putAlertEvents(address: string, events: AlertEvent[]): Promise<void> {
    await this.load();
    this.data.alertEvents[key(address)] = events;
    await this.flush();
  }
}

let store: UserDataStore | undefined;

/**
 * Returns the process-wide store singleton. Uses the Postgres-backed store when
 * `DATABASE_URL` is configured (production-grade, multi-instance safe) and
 * otherwise the local file store (fine for a single server / development).
 */
export function getStore(): UserDataStore {
  if (!store) {
    if (process.env.DATABASE_URL) {
      store = new PostgresStore(process.env.DATABASE_URL);
    } else {
      const file = process.env.DATA_DIR
        ? join(process.env.DATA_DIR, "store.json")
        : join(process.cwd(), ".data", "store.json");
      store = new FileStore(file);
    }
  }
  return store;
}
