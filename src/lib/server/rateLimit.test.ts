import { afterEach, describe, expect, it } from "vitest";
import {
  clientIp,
  decideRateLimit,
  rateLimit,
  resetRateLimitMemory,
  takeMemorySlot,
} from "./rateLimit";

afterEach(() => {
  resetRateLimitMemory();
});

describe("clientIp", () => {
  it("prefers x-real-ip over a forwarded chain", () => {
    const request = new Request("https://www.novafolio.app/api/portfolio", {
      headers: {
        "x-real-ip": "203.0.113.8",
        "x-forwarded-for": "198.51.100.4, 203.0.113.8",
      },
    });
    expect(clientIp(request)).toBe("203.0.113.8");
  });

  it("uses the first forwarded hop when x-real-ip is absent", () => {
    const request = new Request("https://www.novafolio.app/api/portfolio", {
      headers: { "x-forwarded-for": " 198.51.100.4 , 203.0.113.8" },
    });
    expect(clientIp(request)).toBe("198.51.100.4");
  });

  it("shares one bucket when no address is present", () => {
    expect(clientIp(new Request("https://www.novafolio.app/api/portfolio"))).toBe("unknown");
  });
});

describe("takeMemorySlot", () => {
  it("allows the window and then refuses until it resets", () => {
    const store = new Map();
    expect(takeMemorySlot("portfolio:1", 1_000, 2, 60_000, store).allowed).toBe(true);
    expect(takeMemorySlot("portfolio:1", 1_500, 2, 60_000, store).allowed).toBe(true);
    const blocked = takeMemorySlot("portfolio:1", 2_000, 2, 60_000, store);
    expect(blocked).toEqual({ allowed: false, retryAfterSeconds: 59, limit: 2 });
    expect(takeMemorySlot("portfolio:1", 61_000, 2, 60_000, store).allowed).toBe(true);
  });

  it("keeps routes and addresses separate", () => {
    const store = new Map();
    takeMemorySlot("portfolio:1", 0, 1, 60_000, store);
    expect(takeMemorySlot("prices:1", 0, 1, 60_000, store).allowed).toBe(true);
    expect(takeMemorySlot("portfolio:2", 0, 1, 60_000, store).allowed).toBe(true);
  });
});

describe("decideRateLimit", () => {
  it("uses memory when Upstash is not configured", async () => {
    const first = await decideRateLimit("203.0.113.9", "portfolio", 1, 60_000, {
      now: () => 5_000,
      env: {},
    });
    const second = await decideRateLimit("203.0.113.9", "portfolio", 1, 60_000, {
      now: () => 6_000,
      env: {},
    });
    expect(first.allowed).toBe(true);
    expect(second).toMatchObject({ allowed: false, limit: 1 });
  });

  it("counts through Upstash when both variables are set", async () => {
    const bodies = [
      { result: [{ result: 1 }, { result: 1 }, { result: 60000 }] },
      { result: [{ result: 3 }, { result: 0 }, { result: 12000 }] },
    ];
    const fetchImpl: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://example.upstash.io/pipeline");
      expect(init?.method).toBe("POST");
      const headers = new Headers(init?.headers);
      expect(headers.get("authorization")).toBe("Bearer token");
      const body = bodies.shift();
      return new Response(JSON.stringify(body), { status: 200 });
    };
    const allowed = await decideRateLimit("203.0.113.10", "prices", 2, 60_000, {
      env: { url: "https://example.upstash.io/", token: "token" },
      fetch: fetchImpl,
    });
    const blocked = await decideRateLimit("203.0.113.10", "prices", 2, 60_000, {
      env: { url: "https://example.upstash.io/", token: "token" },
      fetch: fetchImpl,
    });
    expect(allowed).toEqual({ allowed: true, remaining: 1, limit: 2 });
    expect(blocked).toEqual({ allowed: false, retryAfterSeconds: 12, limit: 2 });
  });

  it("returns 429 after the portfolio window is full", async () => {
    const request = () =>
      new Request("https://www.novafolio.app/api/portfolio", {
        headers: { "x-real-ip": "203.0.113.50" },
      });
    for (let i = 0; i < 20; i += 1) {
      expect(await rateLimit(request(), "portfolio")).toBeNull();
    }
    const blocked = await rateLimit(request(), "portfolio");
    expect(blocked?.status).toBe(429);
    expect(blocked?.headers.get("retry-after")).toBeTruthy();
    const body = (await blocked?.json()) as { error?: string };
    expect(body.error).toMatch(/Too many requests/);
  });

  it("falls back to memory when Upstash errors", async () => {
    const fetchImpl: typeof fetch = async () => new Response("nope", { status: 500 });
    const decision = await decideRateLimit("203.0.113.11", "gas", 5, 60_000, {
      now: () => 10_000,
      env: { url: "https://example.upstash.io", token: "token" },
      fetch: fetchImpl,
    });
    expect(decision.allowed).toBe(true);
  });
});
