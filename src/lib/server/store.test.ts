import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NetWorthSnapshot, TrackedPosition } from "@/types";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "bwt-store-"));
  process.env.DATA_DIR = dir;
  vi.resetModules();
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  delete process.env.DATA_DIR;
});

async function freshStore() {
  vi.resetModules();
  const mod = await import("./store");
  return mod.getStore();
}

const snapshot: NetWorthSnapshot = {
  date: "2026-06-30",
  walletUsd: 100,
  defiUsd: 50,
  totalUsd: 150,
};

const position: TrackedPosition = {
  id: "p1",
  poolId: "pool-1",
  project: "Aerodrome",
  symbol: "USDC-WETH",
  amountUsd: 1000,
  apyAtEntry: 6.1,
  addedAt: 1_700_000_000_000,
};

describe("FileStore", () => {
  it("scopes data per address and returns empty by default", async () => {
    const store = await freshStore();
    expect(await store.getSnapshots("0xabc")).toEqual([]);
    expect(await store.getPositions("0xabc")).toEqual([]);
  });

  it("persists snapshots and positions, case-insensitively by address", async () => {
    const store = await freshStore();
    await store.putSnapshots("0xABC", [snapshot]);
    await store.putPositions("0xABC", [position]);
    expect(await store.getSnapshots("0xabc")).toEqual([snapshot]);
    expect(await store.getPositions("0xabc")).toEqual([position]);
  });

  it("survives a process restart by reloading from disk", async () => {
    const first = await freshStore();
    await first.putSnapshots("0xabc", [snapshot]);

    // New module instance = fresh in-memory state, same data dir.
    const second = await freshStore();
    expect(await second.getSnapshots("0xabc")).toEqual([snapshot]);
  });

  it("lists users that have any stored data", async () => {
    const store = await freshStore();
    await store.putSnapshots("0xAAA", [snapshot]);
    await store.putPositions("0xBBB", [position]);
    const users = await store.listUsers();
    expect(users.sort()).toEqual(["0xaaa", "0xbbb"]);
  });

  it("de-dupes waitlist emails", async () => {
    const store = await freshStore();
    await store.addWaitlist("Test@Example.com ", "pricing");
    await store.addWaitlist("test@example.com");
    // Second add is a no-op; assert via reload that only one entry exists.
    const raw = await import("node:fs/promises").then((fs) =>
      fs.readFile(join(dir, "store.json"), "utf8"),
    );
    const parsed = JSON.parse(raw) as { waitlist: unknown[] };
    expect(parsed.waitlist).toHaveLength(1);
  });
});
