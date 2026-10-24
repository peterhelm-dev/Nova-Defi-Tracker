import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export type HealthSubscription = {
  id: string;
  email: string;
  address: string;
  threshold: number;
  status: "pending" | "active";
  confirmHash: string | null;
  unsubToken: string;
  createdAt: number;
  confirmedAt: number | null;
  lastAlertAt: number | null;
  lastConfirmSentAt: number | null;
  lockUntil: number | null;
};

export type Claim = { lockUntil: number };

export interface HealthAlertStore {
  getByPair(email: string, address: string): Promise<HealthSubscription | null>;
  /** False when this email and wallet already have a row. */
  insert(record: HealthSubscription): Promise<boolean>;
  update(record: HealthSubscription): Promise<void>;
  getByConfirmHash(hash: string): Promise<HealthSubscription | null>;
  getByUnsubToken(token: string): Promise<HealthSubscription | null>;
  remove(id: string): Promise<void>;
  listActive(): Promise<HealthSubscription[]>;
  claim(id: string, now: number, cooldownMs: number, lockMs: number): Promise<Claim | null>;
  commitAlert(id: string, at: number, lockUntil: number): Promise<void>;
  release(id: string, lockUntil: number): Promise<void>;
}

export function randomToken(): string {
  return randomBytes(32).toString("base64url");
}

export function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function tokenMatches(stored: string, provided: string): boolean {
  const left = Buffer.from(stored);
  const right = Buffer.from(provided);
  if (left.length !== right.length || left.length === 0) return false;
  return timingSafeEqual(left, right);
}

function pairKey(email: string, address: string): string {
  return `${email.trim().toLowerCase()}|${address.trim().toLowerCase()}`;
}

const ACTIVE_LIMIT = 500;

export function createMemoryHealthAlertStore(): HealthAlertStore {
  const records = new Map<string, HealthSubscription>();
  const pairs = new Map<string, string>();
  const confirms = new Map<string, string>();
  const unsubs = new Map<string, string>();

  function forget(record: HealthSubscription): void {
    pairs.delete(pairKey(record.email, record.address));
    if (record.confirmHash) confirms.delete(record.confirmHash);
    unsubs.delete(tokenHash(record.unsubToken));
  }

  function remember(record: HealthSubscription): void {
    records.set(record.id, record);
    pairs.set(pairKey(record.email, record.address), record.id);
    if (record.confirmHash) confirms.set(record.confirmHash, record.id);
    unsubs.set(tokenHash(record.unsubToken), record.id);
  }

  return {
    async getByPair(email, address) {
      const id = pairs.get(pairKey(email, address));
      return id ? records.get(id) ?? null : null;
    },
    async insert(record) {
      if (pairs.has(pairKey(record.email, record.address))) return false;
      remember(record);
      return true;
    },
    async update(record) {
      const previous = records.get(record.id);
      if (previous) forget(previous);
      remember(record);
    },
    async getByConfirmHash(hash) {
      const id = confirms.get(hash);
      return id ? records.get(id) ?? null : null;
    },
    async getByUnsubToken(token) {
      const id = unsubs.get(tokenHash(token));
      const record = id ? records.get(id) : undefined;
      if (!record || !tokenMatches(record.unsubToken, token)) return null;
      return record;
    },
    async remove(id) {
      const record = records.get(id);
      if (!record) return;
      forget(record);
      records.delete(id);
    },
    async listActive() {
      return [...records.values()]
        .filter((record) => record.status === "active")
        .sort((a, b) => (a.lastAlertAt ?? 0) - (b.lastAlertAt ?? 0))
        .slice(0, ACTIVE_LIMIT);
    },
    async claim(id, now, cooldownMs, lockMs) {
      const record = records.get(id);
      if (!record || record.status !== "active") return null;
      if (record.lockUntil !== null && record.lockUntil > now) return null;
      if (record.lastAlertAt !== null && now - record.lastAlertAt < cooldownMs) return null;
      const lockUntil = now + lockMs;
      record.lockUntil = lockUntil;
      return { lockUntil };
    },
    async commitAlert(id, at, lockUntil) {
      const record = records.get(id);
      if (!record || record.lockUntil !== lockUntil) return;
      record.lastAlertAt = at;
      record.lockUntil = null;
    },
    async release(id, lockUntil) {
      const record = records.get(id);
      if (!record || record.lockUntil !== lockUntil) return;
      record.lockUntil = null;
    },
  };
}

/** JSON file for local dev. Not selected on Vercel, where the disk is ephemeral. */
export function createFileHealthAlertStore(file: string): HealthAlertStore {
  const memory = createMemoryHealthAlertStore();
  let ready: Promise<void> | null = null;
  let queue: Promise<void> = Promise.resolve();
  const all: HealthSubscription[] = [];

  async function load(): Promise<void> {
    if (!ready) {
      ready = (async () => {
        try {
          const parsed = JSON.parse(await readFile(file, "utf8")) as HealthSubscription[];
          if (!Array.isArray(parsed)) return;
          for (const record of parsed) {
            if (await memory.insert(record)) all.push(record);
          }
        } catch {
          // First run, or a file this process cannot read.
        }
      })();
    }
    await ready;
  }

  function syncFromMemory(record: HealthSubscription | null, id: string): void {
    const index = all.findIndex((item) => item.id === id);
    if (!record) {
      if (index >= 0) all.splice(index, 1);
      return;
    }
    if (index >= 0) all[index] = { ...record };
    else all.push({ ...record });
  }

  async function persist(): Promise<void> {
    const body = JSON.stringify(all);
    queue = queue.then(async () => {
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, body, "utf8");
    });
    await queue;
  }

  return {
    async getByPair(email, address) {
      await load();
      return memory.getByPair(email, address);
    },
    async insert(record) {
      await load();
      const ok = await memory.insert(record);
      if (!ok) return false;
      syncFromMemory(record, record.id);
      await persist();
      return true;
    },
    async update(record) {
      await load();
      await memory.update(record);
      syncFromMemory(record, record.id);
      await persist();
    },
    async getByConfirmHash(hash) {
      await load();
      return memory.getByConfirmHash(hash);
    },
    async getByUnsubToken(token) {
      await load();
      return memory.getByUnsubToken(token);
    },
    async remove(id) {
      await load();
      await memory.remove(id);
      syncFromMemory(null, id);
      await persist();
    },
    async listActive() {
      await load();
      return memory.listActive();
    },
    async claim(id, now, cooldownMs, lockMs) {
      await load();
      const claim = await memory.claim(id, now, cooldownMs, lockMs);
      if (claim) {
        const current = all.find((item) => item.id === id);
        if (current) current.lockUntil = claim.lockUntil;
        await persist();
      }
      return claim;
    },
    async commitAlert(id, at, lockUntil) {
      await load();
      await memory.commitAlert(id, at, lockUntil);
      const current = all.find((item) => item.id === id);
      if (current) {
        current.lastAlertAt = at;
        current.lockUntil = null;
      }
      await persist();
    },
    async release(id, lockUntil) {
      await load();
      await memory.release(id, lockUntil);
      const current = all.find((item) => item.id === id);
      if (current && current.lockUntil === lockUntil) current.lockUntil = null;
      await persist();
    },
  };
}
