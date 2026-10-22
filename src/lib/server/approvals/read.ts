import { unstable_cache } from "next/cache";
import { erc20Abi, formatUnits, parseAbiItem, type Address } from "viem";
import { selectOpenApprovals } from "@/lib/approvals";
import { AAVE_MARKETS, COMPOUND_MARKETS } from "@/lib/defi/markets";
import { evmClient, trackedChains } from "../evm";

const approvalEvent = parseAbiItem("event Approval(address indexed owner, address indexed spender, uint256 value)");

const CHAIN_ID: Record<string, number> = {
  ethereum: 1,
  base: 8453,
  arbitrum: 42161,
  optimism: 10,
  polygon: 137,
  avalanche: 43114,
  "binance-smart-chain": 56,
};

/** How far back one log query tries. A failure retries a shorter window and marks the result partial. */
const LOOKBACK: Record<string, bigint> = {
  ethereum: BigInt(8_000_000),
  base: BigInt(25_000_000),
  arbitrum: BigInt(200_000_000),
  optimism: BigInt(100_000_000),
  polygon: BigInt(50_000_000),
  avalanche: BigInt(30_000_000),
  "binance-smart-chain": BigInt(30_000_000),
};

const SHORT_LOOKBACK = BigInt(500_000);

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

function knownSpenders(): Map<string, string> {
  const known = new Map<string, string>();
  known.set("0x000000000022d473030f116ddee9f6b43ac78ba3", "Permit2");
  known.set("0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45", "Uniswap");
  known.set("0xef1c6e67703c7bd7107eed8303fbe6ec2554bf6b", "Uniswap");
  for (const market of Object.values(AAVE_MARKETS)) known.set(market.pool.toLowerCase(), "Aave");
  for (const market of COMPOUND_MARKETS) known.set(market.comet.toLowerCase(), "Compound");
  return known;
}

async function logsFor(chain: string, owner: Address): Promise<{ events: { token: string; spender: string; value: bigint; block: bigint }[]; partial: boolean }> {
  const client = evmClient(chain);
  const latest = await client.getBlockNumber();
  const windows = [LOOKBACK[chain] ?? SHORT_LOOKBACK, SHORT_LOOKBACK];
  let lastError: unknown;
  for (const [index, span] of windows.entries()) {
    const fromBlock = latest > span ? latest - span : BigInt(1);
    try {
      const logs = await client.getLogs({
        event: approvalEvent,
        args: { owner },
        fromBlock,
        toBlock: latest,
      });
      return {
        partial: index > 0,
        events: logs.map((log) => ({
          token: (log.address as string).toLowerCase(),
          spender: (log.args.spender as string).toLowerCase(),
          value: log.args.value as bigint,
          block: log.blockNumber ?? BigInt(0),
        })),
      };
    } catch (error) {
      lastError = error;
    }
  }
  console.error(`Approval logs failed on ${chain}`, lastError instanceof Error ? lastError.message : "unknown");
  return { events: [], partial: true };
}

async function readWalletApprovals(address: string): Promise<{ approvals: WalletApproval[]; partial: boolean }> {
  const owner = address as Address;
  const labels = knownSpenders();
  const scanned = await Promise.all(
    trackedChains().map(async (chain) => {
      try {
        const found = await logsFor(chain, owner);
        return { chain, ...found };
      } catch (error) {
        console.error(`Approval scan failed on ${chain}`, error instanceof Error ? error.message : "unknown");
        return { chain, events: [], partial: true };
      }
    }),
  );

  const partial = scanned.some((chain) => chain.partial);
  const approvals: WalletApproval[] = [];

  for (const chain of scanned) {
    const latest = new Map<string, { token: string; spender: string; value: bigint; block: bigint }>();
    for (const event of chain.events) latest.set(`${event.token}:${event.spender}`, event);
    const rows = [...latest.values()].sort((a, b) => (a.block > b.block ? -1 : 1)).slice(0, 40);
    if (rows.length === 0) continue;
    const client = evmClient(chain.chain);
    const contracts = rows.flatMap((row) => [
      { address: row.token as Address, abi: erc20Abi, functionName: "allowance" as const, args: [owner, row.spender as Address] },
      { address: row.token as Address, abi: erc20Abi, functionName: "balanceOf" as const, args: [owner] },
      { address: row.token as Address, abi: erc20Abi, functionName: "decimals" as const },
      { address: row.token as Address, abi: erc20Abi, functionName: "symbol" as const },
    ]);
    const results: { status: string; result?: unknown }[] = [];
    for (let i = 0; i < contracts.length; i += 40) {
      const batch = await client.multicall({ allowFailure: true, contracts: contracts.slice(i, i + 40) });
      results.push(...batch);
    }
    const open = selectOpenApprovals(
      rows.map((row) => ({ token: row.token, owner: address.toLowerCase(), spender: row.spender, value: row.value })),
      rows.map((row, index) => ({
        token: row.token,
        spender: row.spender,
        allowance: results[index * 4]?.status === "success" ? (results[index * 4].result as bigint) : BigInt(0),
      })),
    );
    const byPair = new Map(open.map((row) => [`${row.token}:${row.spender}`, row]));
    for (const [index, row] of rows.entries()) {
      const current = byPair.get(`${row.token}:${row.spender}`);
      if (!current) continue;
      const balance = results[index * 4 + 1]?.status === "success" ? (results[index * 4 + 1].result as bigint) : BigInt(0);
      const decimals = results[index * 4 + 2]?.status === "success" ? Number(results[index * 4 + 2].result) : 18;
      const symbol = results[index * 4 + 3]?.status === "success" ? String(results[index * 4 + 3].result) : "token";
      approvals.push({
        chain: chain.chain,
        chainId: CHAIN_ID[chain.chain] ?? 1,
        token: row.token,
        symbol,
        decimals,
        spender: row.spender,
        spenderLabel: labels.get(row.spender) ?? null,
        allowance: formatUnits(current.allowance, decimals),
        balance: formatUnits(balance, decimals),
        unlimited: current.unlimited,
      });
    }
  }

  return { approvals, partial };
}

export const getWalletApprovals = unstable_cache(readWalletApprovals, ["approvals-v1"], { revalidate: 1800 });
