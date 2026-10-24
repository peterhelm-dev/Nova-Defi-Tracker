import { tokenHash, tokenMatches, type Claim, type HealthAlertStore, type HealthSubscription } from "./store";

const ACTIVE_LIMIT = 500;

type RedisEnv = { url: string; token: string; fetchImpl?: typeof fetch };

async function command(env: RedisEnv, args: string[]): Promise<unknown> {
  const response = await (env.fetchImpl ?? fetch)(env.url.replace(/\/$/, ""), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`upstash ${response.status}`);
  const body = (await response.json()) as { result?: unknown; error?: string } | unknown;
  if (body && typeof body === "object" && "error" in body && body.error) {
    throw new Error(String(body.error));
  }
  if (body && typeof body === "object" && "result" in body) return body.result;
  return body;
}

function recKey(id: string): string {
  return `nova:hf:rec:${id}`;
}

function pairKey(email: string, address: string): string {
  return `nova:hf:pair:${tokenHash(`${email.trim().toLowerCase()}|${address.trim().toLowerCase()}`)}`;
}

function parseRecord(value: unknown): HealthSubscription | null {
  if (typeof value !== "string" || value.length === 0) return null;
  try {
    const parsed = JSON.parse(value) as HealthSubscription;
    if (!parsed || typeof parsed.id !== "string" || typeof parsed.email !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function createRedisHealthAlertStore(env: RedisEnv): HealthAlertStore {
  async function read(id: string): Promise<HealthSubscription | null> {
    return parseRecord(await command(env, ["GET", recKey(id)]));
  }

  async function write(record: HealthSubscription): Promise<void> {
    const previous = await read(record.id);
    if (previous?.confirmHash && previous.confirmHash !== record.confirmHash) {
      await command(env, ["DEL", `nova:hf:confirm:${previous.confirmHash}`]);
    }
    await command(env, ["SET", recKey(record.id), JSON.stringify(record)]);
    await command(env, ["SET", pairKey(record.email, record.address), record.id]);
    await command(env, ["SADD", "nova:hf:ids", record.id]);
    if (record.confirmHash) {
      await command(env, ["SET", `nova:hf:confirm:${record.confirmHash}`, record.id]);
    }
    await command(env, ["SET", `nova:hf:unsub:${tokenHash(record.unsubToken)}`, record.id]);
  }

  return {
    async getByPair(email, address) {
      const id = await command(env, ["GET", pairKey(email, address)]);
      return typeof id === "string" ? read(id) : null;
    },
    async insert(record) {
      const claimed = await command(env, ["SET", pairKey(record.email, record.address), record.id, "NX"]);
      if (claimed !== "OK") return false;
      await command(env, ["SET", recKey(record.id), JSON.stringify(record)]);
      await command(env, ["SADD", "nova:hf:ids", record.id]);
      if (record.confirmHash) await command(env, ["SET", `nova:hf:confirm:${record.confirmHash}`, record.id]);
      await command(env, ["SET", `nova:hf:unsub:${tokenHash(record.unsubToken)}`, record.id]);
      return true;
    },
    async update(record) {
      await write(record);
    },
    async getByConfirmHash(hash) {
      const id = await command(env, ["GET", `nova:hf:confirm:${hash}`]);
      return typeof id === "string" ? read(id) : null;
    },
    async getByUnsubToken(token) {
      const id = await command(env, ["GET", `nova:hf:unsub:${tokenHash(token)}`]);
      if (typeof id !== "string") return null;
      const record = await read(id);
      if (!record || !tokenMatches(record.unsubToken, token)) return null;
      return record;
    },
    async remove(id) {
      const record = await read(id);
      if (!record) return;
      await command(env, ["DEL", recKey(id)]);
      await command(env, ["DEL", pairKey(record.email, record.address)]);
      if (record.confirmHash) await command(env, ["DEL", `nova:hf:confirm:${record.confirmHash}`]);
      await command(env, ["DEL", `nova:hf:unsub:${tokenHash(record.unsubToken)}`]);
      await command(env, ["SREM", "nova:hf:ids", id]);
    },
    async listActive() {
      const ids = await command(env, ["SMEMBERS", "nova:hf:ids"]);
      if (!Array.isArray(ids)) return [];
      const records: HealthSubscription[] = [];
      for (const id of ids.slice(0, ACTIVE_LIMIT * 2)) {
        if (typeof id !== "string") continue;
        const record = await read(id);
        if (!record) {
          await command(env, ["SREM", "nova:hf:ids", id]);
          continue;
        }
        if (record.status === "active") records.push(record);
      }
      return records.sort((a, b) => (a.lastAlertAt ?? 0) - (b.lastAlertAt ?? 0)).slice(0, ACTIVE_LIMIT);
    },
    async claim(id, now, cooldownMs, lockMs) {
      const lockKey = `nova:hf:lock:${id}`;
      const lockUntil = now + lockMs;
      const claimed = await command(env, ["SET", lockKey, String(lockUntil), "NX", "PX", String(lockMs)]);
      if (claimed !== "OK") return null;
      const record = await read(id);
      if (!record || record.status !== "active" || (record.lastAlertAt !== null && now - record.lastAlertAt < cooldownMs)) {
        await command(env, ["DEL", lockKey]);
        return null;
      }
      record.lockUntil = lockUntil;
      await command(env, ["SET", recKey(id), JSON.stringify(record)]);
      return { lockUntil };
    },
    async commitAlert(id, at, lockUntil) {
      const record = await read(id);
      if (!record || record.lockUntil !== lockUntil) return;
      record.lastAlertAt = at;
      record.lockUntil = null;
      await command(env, ["SET", recKey(id), JSON.stringify(record)]);
      await command(env, ["DEL", `nova:hf:lock:${id}`]);
    },
    async release(id, lockUntil) {
      const record = await read(id);
      if (record && record.lockUntil === lockUntil) {
        record.lockUntil = null;
        await command(env, ["SET", recKey(id), JSON.stringify(record)]);
      }
      const current = await command(env, ["GET", `nova:hf:lock:${id}`]);
      if (current === String(lockUntil)) await command(env, ["DEL", `nova:hf:lock:${id}`]);
    },
  };
}

export type { Claim };
