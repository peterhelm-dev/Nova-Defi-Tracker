import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Subscription } from "@/types";

let dir: string;
const ADDR = "0x0000000000000000000000000000000000000001";

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "bwt-ent-"));
  process.env.DATA_DIR = dir;
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.PRO_ADDRESSES;
  vi.resetModules();
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  delete process.env.DATA_DIR;
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.PRO_ADDRESSES;
});

async function load() {
  vi.resetModules();
  const ent = await import("./entitlements");
  const store = await import("./store");
  return { ...ent, getStore: store.getStore };
}

const activeSub: Subscription = {
  plan: "pro",
  status: "active",
  stripeCustomerId: "cus_1",
  updatedAt: 0,
};

describe("isEntitledPro", () => {
  it("grants the comp allowlist regardless of billing", async () => {
    process.env.PRO_ADDRESSES = ADDR;
    const { isEntitledPro } = await load();
    expect(await isEntitledPro(ADDR)).toBe(true);
  });

  it("dev fallback: everyone is Pro when billing off and no allowlist", async () => {
    const { isEntitledPro } = await load();
    expect(await isEntitledPro(ADDR)).toBe(true);
  });

  it("dev fallback: only the allowlist when billing off and allowlist set", async () => {
    process.env.PRO_ADDRESSES = "0x00000000000000000000000000000000000000ff";
    const { isEntitledPro } = await load();
    expect(await isEntitledPro(ADDR)).toBe(false);
  });

  it("billing on: denies without an active subscription", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    const { isEntitledPro } = await load();
    expect(await isEntitledPro(ADDR)).toBe(false);
  });

  it("billing on: grants with an active subscription in the store", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    const { isEntitledPro, getStore } = await load();
    await getStore().setSubscription(ADDR, activeSub);
    expect(await isEntitledPro(ADDR)).toBe(true);
  });

  it("billing on: denies a canceled subscription", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    const { isEntitledPro, getStore } = await load();
    await getStore().setSubscription(ADDR, { ...activeSub, status: "canceled" });
    expect(await isEntitledPro(ADDR)).toBe(false);
  });
});
