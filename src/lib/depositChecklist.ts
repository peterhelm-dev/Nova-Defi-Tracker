import { poolHasImpermanentLoss } from "./trueYield";

export type ProtocolFact = {
  audits: number | null;
  listedAt: number | null;
  tvl: number | null;
  category: string | null;
};

function finiteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
  return null;
}

/** DefiLlama sends `audits` as a numeric string and `listedAt` as unix seconds. */
export function protocolFactFromLlama(json: {
  audits?: unknown;
  listedAt?: unknown;
  tvl?: unknown;
  category?: unknown;
  currentChainTvls?: Record<string, number>;
}): ProtocolFact {
  const listedRaw = finiteNumber(json.listedAt);
  const listedAt = listedRaw === null ? null : listedRaw * (listedRaw < 10_000_000_000 ? 1000 : 1);
  const chainTvl = json.currentChainTvls
    ? Object.entries(json.currentChainTvls)
        .filter(([name]) => name !== "borrowed")
        .reduce((sum, [, value]) => sum + (typeof value === "number" ? value : 0), 0)
    : null;
  return {
    audits: finiteNumber(json.audits),
    listedAt,
    tvl: finiteNumber(json.tvl) ?? chainTvl,
    category: typeof json.category === "string" ? json.category : null,
  };
}

export type ChecklistItem = {
  id: string;
  title: string;
  detail: string;
};

export function depositChecklist(input: {
  symbol: string;
  project: string;
  poolTvlUsd: number;
  protocol: ProtocolFact | null;
  exitGasUsd: number | null;
}): ChecklistItem[] {
  const volatile = poolHasImpermanentLoss(input.symbol);
  const listed = input.protocol?.listedAt ? new Date(input.protocol.listedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : null;
  const audits = input.protocol?.audits;
  const auditLine =
    audits === null || audits === undefined
      ? "DefiLlama didn't return an audit count for this protocol."
      : audits > 0
        ? `DefiLlama lists ${audits} audit${audits === 1 ? "" : "s"}. An audit is not a promise that the pool is safe.`
        : "DefiLlama lists no audits for this protocol.";

  return [
    {
      id: "approval",
      title: "Approval",
      detail:
        "Depositing usually asks the wallet to approve an ERC-20 spend. An unlimited approval stays open until you revoke it. Novafolio never asks you to sign one.",
    },
    {
      id: "audit",
      title: "Audit and age",
      detail: `${auditLine}${listed ? ` DefiLlama has listed it since ${listed}.` : ""}`,
    },
    {
      id: "tvl",
      title: "Size",
      detail: `This pool shows about $${Math.round(input.poolTvlUsd).toLocaleString("en-US")} of TVL.${
        input.protocol?.tvl ? ` The protocol's tracked TVL is about $${Math.round(input.protocol.tvl).toLocaleString("en-US")}.` : ""
      } A large number is not the same as a safe one.`,
    },
    {
      id: "il",
      title: "Impermanent loss",
      detail: volatile
        ? "The symbol looks like a volatile pair. If the two prices diverge, a 50/50 pool can be worth less than holding the coins. The yield calculator has a slider for that."
        : "This listing looks like a single asset or a stable pair, so classic impermanent loss does not apply. Smart-contract and depeg risk still do.",
    },
    {
      id: "lockup",
      title: "Lockup",
      detail:
        "The pool feed does not include an unbonding period or a lockup. Check the protocol itself before you deposit. Some staking and lending markets let you exit immediately, and some do not.",
    },
    {
      id: "exit",
      title: "Exit cost",
      detail:
        input.exitGasUsd === null
          ? "Leaving means a withdraw transaction. Gas price did not load, so the dollar cost is unknown."
          : input.exitGasUsd > 0 && input.exitGasUsd < 0.01
            ? "Leaving means a withdraw transaction. At the current gas price that is under $0.01, before any protocol fee."
            : `Leaving means a withdraw transaction. At the current gas price that is about $${input.exitGasUsd.toFixed(2)}, before any protocol fee.`,
    },
  ];
}
