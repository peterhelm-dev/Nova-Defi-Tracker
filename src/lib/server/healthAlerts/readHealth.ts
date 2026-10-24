import { getAddress, isAddress, parseAbi, type Address } from "viem";
import { AAVE_MARKETS, COMPOUND_MARKETS } from "@/lib/defi/markets";
import { evmClient } from "../evm";
import { readCometRisk } from "../defi/cometLoan";
import type { ProtocolHealth } from "./evaluate";

const poolAbi = parseAbi([
  "function getUserAccountData(address user) view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)",
]);

const borrowAbi = parseAbi(["function borrowBalanceOf(address) view returns (uint256)"]);

function healthFromFactor(factor: bigint, debt: bigint): number | null {
  if (debt <= BigInt(0) || factor > BigInt(10) ** BigInt(30)) return null;
  const health = Number(factor) / 1e18;
  return Number.isFinite(health) ? health : null;
}

async function readChain(chain: string, user: Address): Promise<ProtocolHealth[]> {
  const client = evmClient(chain);
  const found: ProtocolHealth[] = [];
  const pool = AAVE_MARKETS[chain]?.pool;
  if (pool) {
    try {
      const data = await client.readContract({
        address: pool as Address,
        abi: poolAbi,
        functionName: "getUserAccountData",
        args: [user],
      });
      const health = healthFromFactor(data[5], data[1]);
      if (health !== null) found.push({ protocol: "Aave", chain, market: null, healthFactor: health });
    } catch (error) {
      console.error(`Aave health read failed on ${chain}`, error instanceof Error ? error.message : "unknown");
    }
  }

  const comets = COMPOUND_MARKETS.filter((market) => market.chain === chain);
  if (comets.length === 0) return found;
  let borrows: { status: string; result?: unknown }[] = [];
  try {
    borrows = (await client.multicall({
      allowFailure: true,
      contracts: comets.map((market) => ({
        address: market.comet as Address,
        abi: borrowAbi,
        functionName: "borrowBalanceOf",
        args: [user],
      })),
    })) as { status: string; result?: unknown }[];
  } catch (error) {
    console.error(`Compound borrow read failed on ${chain}`, error instanceof Error ? error.message : "unknown");
    return found;
  }

  for (let index = 0; index < comets.length; index += 1) {
    const market = comets[index];
    const row = borrows[index];
    if (!market || row?.status !== "success" || typeof row.result !== "bigint" || row.result <= BigInt(0)) continue;
    const risk = await readCometRisk(client, market.comet as Address, user, row.result);
    if (risk?.healthFactor === null || risk?.healthFactor === undefined) continue;
    found.push({
      protocol: "Compound",
      chain,
      market: market.symbol,
      healthFactor: risk.healthFactor,
    });
  }
  return found;
}

/** One account-data read per Aave market, plus Compound borrows only where a balance exists. */
export async function readProtocolHealth(address: string): Promise<ProtocolHealth[]> {
  if (!isAddress(address)) return [];
  const user = getAddress(address) as Address;
  const chains = [...new Set([...Object.keys(AAVE_MARKETS), ...COMPOUND_MARKETS.map((market) => market.chain)])];
  const settled = await Promise.all(
    chains.map(async (chain) => {
      try {
        return await readChain(chain, user);
      } catch (error) {
        console.error(`Health alert read failed on ${chain}`, error instanceof Error ? error.message : "unknown");
        return [] as ProtocolHealth[];
      }
    }),
  );
  return settled.flat();
}
