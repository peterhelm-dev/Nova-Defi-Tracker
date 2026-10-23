import { NextResponse } from "next/server";

/**
 * Per-IP fixed window for routes that spend Alchemy (or public-RPC fallback)
 * quota. When both UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are
 * set, the counter is shared through Upstash's free REST API. Otherwise the
 * window lives in this server instance's memory, which is the option that
 * works on Vercel Hobby with no extra service. A burst can still land on
 * more than one instance until Upstash is configured.
 */

const WINDOW_MS = 60_000;

const ROUTE_LIMITS = {
  portfolio: 20,
  activity: 20,
  gas: 20,
  approvals: 12,
  prices: 60,
  "token-chart": 40,
  "network-costs": 30,
} as const;

export type LimitedRoute = keyof typeof ROUTE_LIMITS;

type Bucket = { count: number; resetAt: number };

const memory = new Map<string, Bucket>();

export type RateDecision =
  | { allowed: true; remaining: number; limit: number }
  | { allowed: false; retryAfterSeconds: number; limit: number };

export type RateDeps = {
  now?: () => number;
  fetch?: typeof fetch;
  env?: { url?: string; token?: string };
};

/** Vercel sets x-real-ip. Otherwise the first forwarded hop, then a shared bucket. */
export function clientIp(request: Request): string {
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return clip(real);
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  if (first) return clip(first);
  return "unknown";
}

function clip(value: string): string {
  return value.slice(0, 80);
}

export function resetRateLimitMemory(): void {
  memory.clear();
}

export function takeMemorySlot(
  key: string,
  now: number,
  limit: number,
  windowMs: number,
  store: Map<string, Bucket> = memory,
): RateDecision {
  const current = store.get(key);
  if (!current || now >= current.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    if (store.size > 5_000) {
      for (const [storedKey, bucket] of store) {
        if (now >= bucket.resetAt) store.delete(storedKey);
      }
    }
    return { allowed: true, remaining: limit - 1, limit };
  }
  if (current.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
      limit,
    };
  }
  current.count += 1;
  return { allowed: true, remaining: limit - current.count, limit };
}

export async function decideRateLimit(
  ip: string,
  route: string,
  limit: number,
  windowMs: number,
  deps: RateDeps = {},
): Promise<RateDecision> {
  const now = deps.now?.() ?? Date.now();
  const url = deps.env?.url ?? process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = deps.env?.token ?? process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (url && token) {
    try {
      return await takeUpstashSlot(url, token, `${route}:${ip}`, limit, windowMs, deps.fetch ?? fetch);
    } catch (error) {
      console.error("Upstash rate limit failed", error instanceof Error ? error.message : "unknown");
    }
  }
  return takeMemorySlot(`${route}:${ip}`, now, limit, windowMs);
}

async function takeUpstashSlot(
  url: string,
  token: string,
  key: string,
  limit: number,
  windowMs: number,
  fetchImpl: typeof fetch,
): Promise<RateDecision> {
  const redisKey = `nova:rl:${key}`;
  const response = await fetchImpl(`${url.replace(/\/$/, "")}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      ["INCR", redisKey],
      ["PEXPIRE", redisKey, String(windowMs), "NX"],
      ["PTTL", redisKey],
    ]),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`upstash ${response.status}`);
  const results = await readPipeline(await response.json());
  const count = Number(results[0]);
  const ttlMs = Number(results[2]);
  if (!Number.isFinite(count)) throw new Error("upstash count missing");
  if (count > limit) {
    const retryAfterSeconds = Number.isFinite(ttlMs) && ttlMs > 0
      ? Math.max(1, Math.ceil(ttlMs / 1000))
      : Math.ceil(windowMs / 1000);
    return { allowed: false, retryAfterSeconds, limit };
  }
  return { allowed: true, remaining: Math.max(0, limit - count), limit };
}

async function readPipeline(body: unknown): Promise<unknown[]> {
  const rows = Array.isArray(body)
    ? body
    : body && typeof body === "object" && Array.isArray((body as { result?: unknown }).result)
      ? (body as { result: unknown[] }).result
      : null;
  if (!rows) throw new Error("upstash pipeline shape");
  return rows.map((row) => {
    if (row && typeof row === "object" && "result" in row) return (row as { result: unknown }).result;
    return row;
  });
}

export async function rateLimit(request: Request, route: LimitedRoute): Promise<NextResponse | null> {
  const limit = ROUTE_LIMITS[route];
  const decision = await decideRateLimit(clientIp(request), route, limit, WINDOW_MS);
  if (decision.allowed) return null;
  return NextResponse.json(
    { error: "Too many requests. Try again shortly." },
    {
      status: 429,
      headers: {
        "Retry-After": String(decision.retryAfterSeconds),
        "Cache-Control": "no-store",
      },
    },
  );
}
