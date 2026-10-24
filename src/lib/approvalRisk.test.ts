import { describe, expect, it } from "vitest";
import { isUnlimitedAllowance } from "./approvals";
import { classifyApproval } from "./approvalRisk";
import { exploitName } from "./server/approvals/exploits";
import list from "./exploits/approvalExploits.json";

const MAX = (BigInt(1) << BigInt(256)) - BigInt(1);

describe("classifyApproval", () => {
  it("treats an unlimited allowance as review even for a known contract", () => {
    expect(isUnlimitedAllowance(MAX)).toBe(true);
    const risk = classifyApproval({
      unlimited: true,
      knownSpender: true,
      code: "contract",
      exploitName: null,
    });
    expect(risk.level).toBe("review");
    expect(risk.reason).toContain("no limit");
    expect(risk.reason.toLowerCase()).not.toContain("revoke now");
  });

  it("marks an externally owned spender as high risk", () => {
    const risk = classifyApproval({
      unlimited: false,
      knownSpender: false,
      code: "eoa",
      exploitName: null,
    });
    expect(risk.level).toBe("high");
    expect(risk.reason).toContain("externally owned account");
  });

  it("does not call a contract unverified on a block explorer", () => {
    const risk = classifyApproval({
      unlimited: false,
      knownSpender: false,
      code: "contract",
      exploitName: null,
    });
    expect(risk.level).toBe("review");
    expect(risk.reason).toContain("known-contract list");
    expect(risk.reason.toLowerCase()).not.toContain("unverified on");
  });

  it("names an exploited spender and still mentions an unlimited allowance", () => {
    const risk = classifyApproval({
      unlimited: true,
      knownSpender: false,
      code: "contract",
      exploitName: "Ledger Connect Kit Hack",
    });
    expect(risk.level).toBe("high");
    expect(risk.reason).toContain("Ledger Connect Kit Hack");
    expect(risk.reason).toContain("no limit");
  });

  it("leaves a limited known contract at low risk", () => {
    const risk = classifyApproval({
      unlimited: false,
      knownSpender: true,
      code: "contract",
      exploitName: null,
    });
    expect(risk.level).toBe("low");
    expect(risk.reason).toContain("recognizes");
  });
});

describe("bundled exploit list", () => {
  it("finds an address from the MIT Revoke.cash list and ignores a random one", () => {
    const entry = list.entries.find((item) => item.name === "Ledger Connect Kit Hack");
    expect(entry).toBeTruthy();
    expect(exploitName(entry!.chainId, entry!.address)).toBe("Ledger Connect Kit Hack");
    expect(exploitName(1, "0x0000000000000000000000000000000000000001")).toBeNull();
    expect(list.license).toBe("MIT");
  });
});
