import { describe, expect, it } from "vitest";
import {
  formatPercent,
  formatTokenAmount,
  formatUpdatedAt,
  formatUsd,
  shortenAddress,
} from "./format";

describe("formatUsd", () => {
  it("formats small values with cents", () => {
    expect(formatUsd(12.5)).toBe("$12.50");
  });

  it("rounds large values to whole dollars", () => {
    expect(formatUsd(125_000.4)).toBe("$125,000");
  });

  it("falls back to $0.00 for non-finite input", () => {
    expect(formatUsd(NaN)).toBe("$0.00");
    expect(formatUsd(Infinity)).toBe("$0.00");
  });
});

describe("formatPercent", () => {
  it("adds a plus sign for positive values", () => {
    expect(formatPercent(3.456)).toBe("+3.46%");
  });

  it("keeps the minus sign for negative values", () => {
    expect(formatPercent(-1.2)).toBe("-1.20%");
  });

  it("returns an em dash for null/undefined/non-finite", () => {
    expect(formatPercent(null)).toBe("—");
    expect(formatPercent(undefined)).toBe("—");
    expect(formatPercent(NaN)).toBe("—");
  });
});

describe("formatTokenAmount", () => {
  it("formats with the default max decimals", () => {
    expect(formatTokenAmount(1234.56789)).toBe("1,234.5679");
  });

  it("falls back to 0 for non-finite input", () => {
    expect(formatTokenAmount(NaN)).toBe("0");
  });
});

describe("shortenAddress", () => {
  it("shortens a long address", () => {
    expect(shortenAddress("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913")).toBe(
      "0x8335…2913",
    );
  });

  it("returns short strings unchanged", () => {
    expect(shortenAddress("0x1234")).toBe("0x1234");
  });
});

describe("formatUpdatedAt", () => {
  it("returns an em dash for a falsy timestamp", () => {
    expect(formatUpdatedAt(0)).toBe("—");
  });

  it("formats a timestamp as a time string", () => {
    const ts = new Date("2024-01-01T15:04:00Z").getTime();
    expect(formatUpdatedAt(ts)).toMatch(/\d{1,2}:\d{2}\s?[AP]M/);
  });
});
