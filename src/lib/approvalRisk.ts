export type SpenderCode = "eoa" | "contract" | "unknown";
export type ApprovalRiskLevel = "high" | "review" | "low";

export type ApprovalRisk = {
  level: ApprovalRiskLevel;
  reason: string;
};

/**
 * Labels one open allowance. Explorer verification is not checked: Novafolio
 * has no block-explorer API key, so "not in the known list" is not a claim
 * that Etherscan shows the contract as unverified.
 */
export function classifyApproval(input: {
  unlimited: boolean;
  knownSpender: boolean;
  code: SpenderCode;
  exploitName: string | null;
}): ApprovalRisk {
  const parts: string[] = [];
  if (input.exploitName) {
    parts.push(`This spender is on Revoke.cash's public list of approval exploits (${input.exploitName}).`);
  }
  if (input.code === "eoa") {
    parts.push("This spender is an externally owned account, not a contract.");
  }
  if (input.unlimited) {
    parts.push("This approval has no limit, so the spender can move the full balance of this token.");
  }
  if (!input.knownSpender && input.code === "unknown") {
    parts.push(
      "This spender is not in Novafolio's known-contract list, and the chain did not return its code. Novafolio cannot see whether a block explorer has verified it.",
    );
  } else if (!input.knownSpender && input.code !== "eoa") {
    parts.push(
      "This spender is not in Novafolio's known-contract list. Novafolio cannot see whether a block explorer has verified it.",
    );
  }
  if (parts.length === 0) {
    return {
      level: "low",
      reason: "This is a limited approval to a contract Novafolio recognizes.",
    };
  }
  const level: ApprovalRiskLevel = input.exploitName || input.code === "eoa" ? "high" : "review";
  return { level, reason: parts.join(" ") };
}

export function riskLevelLabel(level: ApprovalRiskLevel): string {
  if (level === "high") return "High risk";
  if (level === "review") return "Review";
  return "Low risk";
}
