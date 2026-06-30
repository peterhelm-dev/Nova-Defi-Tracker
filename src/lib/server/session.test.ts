import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSessionToken,
  verifySessionToken,
  SESSION_TTL_SECONDS,
} from "./session";

describe("session tokens", () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = "test-secret";
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.SESSION_SECRET;
  });

  it("round-trips a valid token and lower-cases the address", () => {
    const token = createSessionToken("0xAbCdEf0000000000000000000000000000000001");
    const payload = verifySessionToken(token);
    expect(payload?.address).toBe("0xabcdef0000000000000000000000000000000001");
  });

  it("rejects a tampered payload", () => {
    const token = createSessionToken("0x0000000000000000000000000000000000000001");
    const [, sig] = token.split(".");
    const forged = `${Buffer.from(
      JSON.stringify({ address: "0xevil", exp: 9999999999 }),
    ).toString("base64url")}.${sig}`;
    expect(verifySessionToken(forged)).toBeNull();
  });

  it("rejects a token signed with a different secret", () => {
    const token = createSessionToken("0x0000000000000000000000000000000000000001");
    process.env.SESSION_SECRET = "another-secret";
    expect(verifySessionToken(token)).toBeNull();
  });

  it("rejects an expired token", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const token = createSessionToken("0x0000000000000000000000000000000000000001", 60);
    vi.setSystemTime(new Date("2026-01-01T00:02:00Z"));
    expect(verifySessionToken(token)).toBeNull();
  });

  it("returns null for malformed or missing tokens", () => {
    expect(verifySessionToken(undefined)).toBeNull();
    expect(verifySessionToken("")).toBeNull();
    expect(verifySessionToken("not-a-token")).toBeNull();
    expect(verifySessionToken("only.")).toBeNull();
  });

  it("accepts a token within its TTL", () => {
    const token = createSessionToken(
      "0x0000000000000000000000000000000000000002",
      SESSION_TTL_SECONDS,
    );
    expect(verifySessionToken(token)?.address).toBe(
      "0x0000000000000000000000000000000000000002",
    );
  });
});
