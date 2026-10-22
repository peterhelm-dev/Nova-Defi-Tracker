import { describe, expect, it } from "vitest";
import { depositChecklist, protocolFactFromLlama } from "./depositChecklist";

describe("depositChecklist", () => {
  it("mentions audits, impermanent loss, and the exit gas", () => {
    const items = depositChecklist({
      symbol: "WETH-USDC",
      project: "uniswap-v3",
      poolTvlUsd: 1_000_000,
      protocol: { audits: 2, listedAt: Date.parse("2021-06-01"), tvl: 4_000_000, category: "Dexs" },
      exitGasUsd: 3.5,
    });
    const byId = Object.fromEntries(items.map((item) => [item.id, item.detail]));
    expect(byId.approval).toMatch(/unlimited approval/i);
    expect(byId.audit).toMatch(/2 audits/);
    expect(byId.il).toMatch(/volatile pair/i);
    expect(byId.lockup).toMatch(/does not include an unbonding period/);
    expect(byId.exit).toMatch(/\$3\.50/);
  });

  it("says classic impermanent loss does not apply to a single asset", () => {
    const items = depositChecklist({
      symbol: "USDC",
      project: "aave-v3",
      poolTvlUsd: 10,
      protocol: null,
      exitGasUsd: null,
    });
    expect(items.find((item) => item.id === "il")?.detail).toMatch(/does not apply/);
    expect(items.find((item) => item.id === "exit")?.detail).toMatch(/unknown/);
  });

  it("does not round a fraction of a cent of exit gas down to zero", () => {
    const items = depositChecklist({
      symbol: "USDC",
      project: "aave-v3",
      poolTvlUsd: 10,
      protocol: null,
      exitGasUsd: 0.004,
    });
    expect(items.find((item) => item.id === "exit")?.detail).toMatch(/under \$0\.01/);
  });
});

describe("protocolFactFromLlama", () => {
  it("reads the audit count when DefiLlama sends it as a string", () => {
    const fact = protocolFactFromLlama({ audits: "3", listedAt: 1693274059, tvl: 100, category: "Dexs" });
    expect(fact.audits).toBe(3);
    expect(fact.listedAt).toBe(1693274059000);
    expect(fact.category).toBe("Dexs");
  });
});
