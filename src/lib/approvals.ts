export const APPROVAL_TOPIC = "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925";

const UNLIMITED = BigInt(1) << BigInt(255);

export type ApprovalLog = {
  address: string;
  topics: string[];
  data: string;
};

export type ApprovalEvent = {
  token: string;
  owner: string;
  spender: string;
  value: bigint;
};

export function isUnlimitedAllowance(value: bigint): boolean {
  return value >= UNLIMITED;
}

export function decodeApprovalLog(log: ApprovalLog): ApprovalEvent | null {
  if ((log.topics[0] ?? "").toLowerCase() !== APPROVAL_TOPIC) return null;
  const ownerTopic = log.topics[1];
  const spenderTopic = log.topics[2];
  if (!ownerTopic || !spenderTopic || !log.data) return null;
  try {
    return {
      token: log.address.toLowerCase(),
      owner: `0x${ownerTopic.slice(-40)}`.toLowerCase(),
      spender: `0x${spenderTopic.slice(-40)}`.toLowerCase(),
      value: BigInt(log.data),
    };
  } catch {
    return null;
  }
}

export type OpenApproval = {
  token: string;
  spender: string;
  allowance: bigint;
  unlimited: boolean;
};

/**
 * Keeps the latest Approval per token and spender, then replaces the event
 * value with the allowance the contract reports now. A zero allowance is closed.
 */
export function selectOpenApprovals(
  events: ApprovalEvent[],
  current: { token: string; spender: string; allowance: bigint }[],
): OpenApproval[] {
  const latest = new Map<string, ApprovalEvent>();
  for (const event of events) {
    latest.set(`${event.token}:${event.spender}`, event);
  }
  const allowances = new Map(current.map((row) => [`${row.token.toLowerCase()}:${row.spender.toLowerCase()}`, row.allowance]));
  const open: OpenApproval[] = [];
  for (const event of latest.values()) {
    const allowance = allowances.get(`${event.token}:${event.spender}`) ?? event.value;
    if (allowance <= BigInt(0)) continue;
    open.push({
      token: event.token,
      spender: event.spender,
      allowance,
      unlimited: isUnlimitedAllowance(allowance),
    });
  }
  return open;
}

/** Dollars that spender could take right now. Unlimited approvals risk the whole balance. */
export function valueAtRisk(balance: number, allowance: number, priceUsd: number | null, unlimited: boolean): number | null {
  if (priceUsd === null || !Number.isFinite(priceUsd) || balance <= 0) return priceUsd === null ? null : 0;
  const exposed = unlimited ? balance : Math.min(balance, Math.max(0, allowance));
  return exposed * priceUsd;
}

export function revokeUrl(address: string, chainId: number): string {
  return `https://revoke.cash/address/${address}?chainId=${chainId}`;
}
