import { describe, expect, it } from "vitest";
import {
  APPROVAL_TOPIC,
  decodeApprovalLog,
  isUnlimitedAllowance,
  revokeUrl,
  selectOpenApprovals,
  valueAtRisk,
} from "./approvals";

const owner = "0x000000000000000000000000d8da6bf26964af9d7eed9e03e53415d37aa96045";
const spender = "0x0000000000000000000000001111111111111111111111111111111111111111";

describe("approvals", () => {
  it("decodes an Approval log and flags an unlimited allowance", () => {
    const event = decodeApprovalLog({
      address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      topics: [APPROVAL_TOPIC, owner, spender],
      data: `0x${((BigInt(1) << BigInt(256)) - BigInt(1)).toString(16)}`,
    });
    expect(event?.owner).toBe("0xd8da6bf26964af9d7eed9e03e53415d37aa96045");
    expect(event?.spender).toBe("0x1111111111111111111111111111111111111111");
    expect(event && isUnlimitedAllowance(event.value)).toBe(true);
  });

  it("drops a spender whose current allowance is zero", () => {
    const open = selectOpenApprovals(
      [
        {
          token: "0xusdc",
          owner: owner.slice(-42),
          spender: "0xrouter",
          value: BigInt(100),
        },
      ],
      [{ token: "0xusdc", spender: "0xrouter", allowance: BigInt(0) }],
    );
    expect(open).toEqual([]);
  });

  it("risks the whole balance on an unlimited approval, and only the allowance otherwise", () => {
    expect(valueAtRisk(100, 1_000_000, 2, true)).toBe(200);
    expect(valueAtRisk(100, 40, 2, false)).toBe(80);
    expect(valueAtRisk(100, 40, null, false)).toBeNull();
  });

  it("links to revoke.cash for that address and chain", () => {
    expect(revokeUrl("0xabc", 8453)).toBe("https://revoke.cash/address/0xabc?chainId=8453");
  });
});
