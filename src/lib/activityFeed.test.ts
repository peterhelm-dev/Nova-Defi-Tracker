import { describe, expect, it } from "vitest";
import { activityFromTransfers } from "./activityFeed";

const wallet = "0xabc0000000000000000000000000000000000001";

describe("activityFromTransfers", () => {
  it("marks direction from the watched wallet and merges legs of one hash", () => {
    const rows = activityFromTransfers(wallet, "base", [
      {
        hash: "0xaaa",
        from: wallet,
        to: "0x00000000000000000000000000000000000000bb",
        asset: "USDC",
        value: 5,
        category: "erc20",
        minedAt: "2026-10-20T00:00:00.000Z",
      },
      {
        hash: "0xaaa",
        from: "0x00000000000000000000000000000000000000bb",
        to: wallet,
        asset: "ETH",
        value: 0.01,
        category: "external",
        minedAt: "2026-10-20T00:00:00.000Z",
      },
      {
        hash: "0xbbb",
        from: "0x00000000000000000000000000000000000000cc",
        to: wallet,
        asset: null,
        value: 1,
        category: "external",
        minedAt: "2026-10-21T00:00:00.000Z",
      },
    ]);

    expect(rows.map((row) => row.hash)).toEqual(["0xbbb", "0xaaa"]);
    expect(rows[1]?.type).toBe("token");
    expect(rows[1]?.transfers.map((leg) => leg.direction)).toEqual(["out", "in"]);
    expect(rows[0]?.transfers[0]).toMatchObject({ direction: "in", symbol: "ETH", valueUsd: null });
    expect(rows[0]?.explorerUrl).toBe("https://basescan.org/tx/0xbbb");
  });
});
