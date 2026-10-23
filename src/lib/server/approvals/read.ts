import { unstable_cache } from "next/cache";
import { erc20Abi, formatUnits, type Address } from "viem";
import { APPROVAL_TOPIC, decodeApprovalLog, isUnlimitedAllowance } from "@/lib/approvals";
import { approvalSpenders, approvalTokens, RECENT_APPROVAL_BLOCKS, spenderLabel } from "@/lib/approvalCatalog";
import { evmClient, trackedChains } from "../evm";

const CHAIN_ID: Record<string, number> = {
  ethereum: 1,
  base: 8453,
  arbitrum: 42161,
  optimism: 10,
  polygon: 137,
  avalanche: 43114,
  "binance-smart-chain": 56,
};

export type WalletApproval = {
  chain: string;
  chainId: number;
  token: string;
  symbol: string;
  decimals: number;
  spender: string;
  spenderLabel: string | null;
  allowance: string;
  balance: string;
  unlimited: boolean;
};

type Pair = { token: string; spender: string; symbol: string; decimals: number };

/**
 * Open allowances are current state, so they are read with Multicall rather
 * than a chain-wide eth_getLogs scan. Public RPCs reject that scan (and any
 * window older than their recent tip), which used to return an empty partial
 * list even when allowance() would have answered.
 */
async function readWalletApprovals(address: string): Promise<{ approvals: WalletApproval[]; partial: boolean }> {
  const owner = address as Address;
  const settled = await Promise.all(
    trackedChains().map(async (chain) => {
      try {
        return await readChain(chain, owner);
      } catch (error) {
        console.error(`Approval read failed on ${chain}`, error instanceof Error ? error.message : "unknown");
        return { approvals: [] as WalletApproval[], partial: true };
      }
    }),
  );
  return {
    approvals: settled.flatMap((chain) => chain.approvals),
    partial: settled.some((chain) => chain.partial),
  };
}

async function readChain(
  chain: string,
  owner: Address,
): Promise<{ approvals: WalletApproval[]; partial: boolean }> {
  const client = evmClient(chain);
  const tokens = approvalTokens(chain);
  const spenders = approvalSpenders(chain);
  const pairs: Pair[] = [];
  for (const token of tokens) {
    for (const spender of spenders) {
      pairs.push({
        token: token.address,
        spender: spender.address,
        symbol: token.symbol,
        decimals: token.decimals,
      });
    }
  }

  const allowances = await batched(client, pairs.map((pair) => ({
    address: pair.token as Address,
    abi: erc20Abi,
    functionName: "allowance" as const,
    args: [owner, pair.spender as Address] as const,
  })));
  const balances = await batched(client, tokens.map((token) => ({
    address: token.address as Address,
    abi: erc20Abi,
    functionName: "balanceOf" as const,
    args: [owner] as const,
  })));

  const open = new Map<string, Pair & { allowance: bigint; balance: bigint }>();
  pairs.forEach((pair, index) => {
    const allowance = allowances[index]?.status === "success" ? (allowances[index].result as bigint) : BigInt(0);
    if (allowance <= BigInt(0)) return;
    const tokenIndex = tokens.findIndex((token) => token.address.toLowerCase() === pair.token.toLowerCase());
    const balance = balances[tokenIndex]?.status === "success" ? (balances[tokenIndex].result as bigint) : BigInt(0);
    open.set(keyOf(pair.token, pair.spender), { ...pair, allowance, balance });
  });

  let partial = false;
  const held = tokens.filter((token, index) => balances[index]?.status === "success" && (balances[index].result as bigint) > BigInt(0));
  try {
    const latest = await client.getBlockNumber();
    const from = latest > RECENT_APPROVAL_BLOCKS ? latest - RECENT_APPROVAL_BLOCKS : BigInt(1);
    const ownerTopic = `0x${owner.slice(2).toLowerCase().padStart(64, "0")}`;
    for (const token of held) {
      let logs: { topics?: string[]; data?: string; address?: string }[] = [];
      try {
        logs = (await client.request({
          method: "eth_getLogs",
          params: [{
            address: token.address,
            fromBlock: `0x${from.toString(16)}`,
            toBlock: `0x${latest.toString(16)}`,
            topics: [APPROVAL_TOPIC, ownerTopic],
          }],
        })) as { topics?: string[]; data?: string; address?: string }[];
      } catch {
        partial = true;
        continue;
      }
      const extraSpenders = new Set<string>();
      for (const log of logs) {
        const event = decodeApprovalLog({
          address: log.address ?? token.address,
          topics: log.topics ?? [],
          data: log.data ?? "0x",
        });
        if (!event) continue;
        if (!open.has(keyOf(event.token, event.spender))) extraSpenders.add(event.spender);
      }
      if (extraSpenders.size === 0) continue;
      const extras = [...extraSpenders];
      const current = await client.multicall({
        allowFailure: true,
        contracts: extras.map((spender) => ({
          address: token.address as Address,
          abi: erc20Abi,
          functionName: "allowance" as const,
          args: [owner, spender as Address] as const,
        })),
      });
      const balance = balances[tokens.findIndex((item) => item.address.toLowerCase() === token.address.toLowerCase())];
      extras.forEach((spender, index) => {
        const allowance = current[index]?.status === "success" ? (current[index].result as bigint) : BigInt(0);
        if (allowance <= BigInt(0)) return;
        open.set(keyOf(token.address, spender), {
          token: token.address,
          spender,
          symbol: token.symbol,
          decimals: token.decimals,
          allowance,
          balance: balance?.status === "success" ? (balance.result as bigint) : BigInt(0),
        });
      });
    }
  } catch {
    partial = true;
  }

  const approvals = [...open.values()].map((row) => ({
    chain,
    chainId: CHAIN_ID[chain] ?? 1,
    token: row.token.toLowerCase(),
    symbol: row.symbol,
    decimals: row.decimals,
    spender: row.spender.toLowerCase(),
    spenderLabel: spenderLabel(chain, row.spender),
    allowance: formatUnits(row.allowance, row.decimals),
    balance: formatUnits(row.balance, row.decimals),
    unlimited: isUnlimitedAllowance(row.allowance),
  }));
  return { approvals, partial };
}

function keyOf(token: string, spender: string): string {
  return `${token.toLowerCase()}:${spender.toLowerCase()}`;
}

async function batched(
  client: ReturnType<typeof evmClient>,
  contracts: Parameters<ReturnType<typeof evmClient>["multicall"]>[0]["contracts"],
) {
  const results: { status: string; result?: unknown }[] = [];
  for (let index = 0; index < contracts.length; index += 80) {
    const batch = await client.multicall({ allowFailure: true, contracts: contracts.slice(index, index + 80) });
    results.push(...batch);
  }
  return results;
}

export const getWalletApprovals = unstable_cache(readWalletApprovals, ["approvals-v2"], { revalidate: 1800 });
