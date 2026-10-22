import { describe, expect, it } from "vitest";
import { classifyGasAction, summarizeGasSpend, type GasSample } from "./gasSpend";

const wallet = "0xabc0000000000000000000000000000000000001";
const now = Date.parse("2026-10-22T00:00:00.000Z");

function sample(overrides: Partial<GasSample> = {}): GasSample {
  return {
    chain: "base",
    hash: "0x1",
    from: wallet,
    status: "success",
    gasUsed: BigInt(100_000),
    effectiveGasPriceWei: BigInt(1_000_000_000),
    input: "0x",
    minedAt: "2026-10-20T00:00:00.000Z",
    ...overrides,
  };
}

describe("classifyGasAction", () => {
  it("treats a revert as failed even when the calldata was an approval", () => {
    expect(classifyGasAction("failed", "0x095ea7b3")).toBe("failed");
  });

  it("recognizes approvals, swaps, and plain transfers", () => {
    expect(classifyGasAction("success", "0x095ea7b3000000")).toBe("approval");
    expect(classifyGasAction("success", "0x3593564c000000")).toBe("swap");
    expect(classifyGasAction("success", "0x")).toBe("transfer");
    expect(classifyGasAction("success", "0xdeadbeef")).toBe("contract");
  });
});

describe("summarizeGasSpend", () => {
  it("counts gas on failed transactions and ignores someone else's transfer", () => {
    const summary = summarizeGasSpend({
      wallet,
      now,
      nativeUsd: { base: 2_000, ethereum: 2_000 },
      samples: [
        sample({ status: "failed", input: "0x095ea7b3" }),
        sample({ hash: "0x2", from: "0x00000000000000000000000000000000000000aa", input: "0x095ea7b3" }),
      ],
    });
    expect(summary.txCount).toBe(1);
    expect(summary.failedTxCount).toBe(1);
    expect(summary.byAction?.map((row) => row.action)).toEqual(["failed"]);
    // 100_000 gas * 1 gwei = 0.0001 ETH * $2,000
    expect(summary.totalUsd).toBeCloseTo(0.2, 6);
  });

  it("dedupes a hash, drops anything outside the window, and adds the L1 fee", () => {
    const summary = summarizeGasSpend({
      wallet,
      now,
      windowDays: 30,
      nativeUsd: { ethereum: 2_000 },
      samples: [
        sample({
          chain: "ethereum",
          hash: "0xsame",
          input: "0xa9059cbb",
          l1FeeWei: BigInt("100000000000000"),
        }),
        sample({ chain: "ethereum", hash: "0xsame", input: "0xa9059cbb" }),
        sample({ chain: "ethereum", hash: "0xold", minedAt: "2026-01-01T00:00:00.000Z" }),
      ],
    });
    expect(summary.txCount).toBe(1);
    expect(summary.byAction?.[0]?.action).toBe("transfer");
    // execution 0.0001 ETH plus 0.0001 ETH of L1 fee, times $2,000
    expect(summary.totalUsd).toBeCloseTo(0.4, 6);
    expect(summary.oldestMinedAt).toBe("2026-10-20T00:00:00.000Z");
  });

  it("marks the total partial when the gas token has no price", () => {
    const summary = summarizeGasSpend({
      wallet,
      now,
      nativeUsd: { base: null },
      samples: [sample()],
    });
    expect(summary.txCount).toBe(1);
    expect(summary.totalUsd).toBe(0);
    expect(summary.partial).toBe(true);
  });
});
