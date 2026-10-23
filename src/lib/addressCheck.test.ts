import { describe, expect, it } from "vitest";
import { approvalSpenders, approvalTokens, RECENT_APPROVAL_BLOCKS } from "./approvalCatalog";
import { bytes32Symbol, identityMismatch, sameAddress } from "./addressCheck";

describe("address identity", () => {
  it("accepts a matching symbol and decimals", () => {
    expect(identityMismatch({ symbol: "USDC", decimals: 6 }, { symbol: "USDC", decimals: 6 })).toBeNull();
  });

  it("rejects a bridged token that only shares the ticker", () => {
    expect(identityMismatch({ symbol: "USDC", decimals: 6 }, { symbol: "USDC", decimals: 18 })).toMatch(/decimals 18/);
  });

  it("decodes a bytes32 symbol", () => {
    expect(bytes32Symbol("0x5553445400000000000000000000000000000000000000000000000000000000")).toBe("USDT");
  });

  it("compares addresses without case", () => {
    expect(sameAddress("0xAbC", "0xabc")).toBe(true);
  });
});

describe("approval catalog", () => {
  it("asks Ethereum for USDC against the Compound USDC comet", () => {
    const usdc = approvalTokens("ethereum").find((token) => token.symbol === "USDC");
    const comet = approvalSpenders("ethereum").find((spender) => spender.label === "Compound USDC");
    expect(usdc?.address.toLowerCase()).toBe("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");
    expect(usdc?.decimals).toBe(6);
    expect(comet?.address.toLowerCase()).toBe("0xc3d688b66703497daa19211eedff47f25384cdc3");
  });

  it("uses Base's own Uniswap router and a short log window", () => {
    expect(approvalSpenders("base").some((spender) => spender.address.toLowerCase() === "0x2626664c2603336e57b271c5c0b26f421741e481")).toBe(true);
    expect(RECENT_APPROVAL_BLOCKS <= BigInt(10000)).toBe(true);
  });
});
