import { afterEach, describe, expect, it, vi } from "vitest";
import {
  accountSyncBlockReason,
  isAccountSyncAvailable,
  isDurableStoreAvailable,
} from "./persistence";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("durable store", () => {
  it("accepts the file store when not on Vercel", () => {
    delete process.env.DATABASE_URL;
    delete process.env.VERCEL;
    expect(isDurableStoreAvailable()).toBe(true);
  });

  it("refuses the file store on Vercel until Postgres is configured", () => {
    delete process.env.DATABASE_URL;
    process.env.VERCEL = "1";
    expect(isDurableStoreAvailable()).toBe(false);
    expect(accountSyncBlockReason()).toMatch(/no database/i);

    process.env.DATABASE_URL = "postgres://localhost/nova";
    expect(isDurableStoreAvailable()).toBe(true);
  });

  it("keeps sign-in off in production without SESSION_SECRET", () => {
    delete process.env.VERCEL;
    delete process.env.DATABASE_URL;
    delete process.env.SESSION_SECRET;
    vi.stubEnv("NODE_ENV", "production");
    expect(isAccountSyncAvailable()).toBe(false);
    expect(accountSyncBlockReason()).toMatch(/SESSION_SECRET/);
  });
});
