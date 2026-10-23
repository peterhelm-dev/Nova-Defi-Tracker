import { writeFileSync } from "node:fs";
import { createPublicClient, http, parseAbi, type Address, type PublicClient } from "viem";
import { arbitrum, avalanche, base, bsc, mainnet, optimism, polygon, type Chain } from "viem/chains";
import { describe, expect, it } from "vitest";
import { bytes32Symbol, identityMismatch, sameAddress } from "@/lib/addressCheck";
import { AAVE_MARKETS, COMPOUND_MARKETS, STAKING_TOKENS } from "@/lib/defi/markets";
import { MAJOR_TOKENS } from "@/lib/majorTokens";
import { BASE_TOKENS } from "@/lib/tokens";

const live = process.env.VERIFY_ADDRESSES === "1";

const stringAbi = parseAbi([
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function name() view returns (string)",
  "function UNDERLYING_ASSET_ADDRESS() view returns (address)",
  "function baseToken() view returns (address)",
  "function getReservesList() view returns (address[])",
  "function getReserveTokensAddresses(address asset) view returns (address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress)",
]);
const bytesAbi = parseAbi(["function symbol() view returns (bytes32)"]);

const CHAINS: Record<string, { chain: Chain; url: string }> = {
  ethereum: { chain: mainnet, url: "https://ethereum.publicnode.com" },
  base: { chain: base, url: "https://base.publicnode.com" },
  arbitrum: { chain: arbitrum, url: "https://arbitrum-one.publicnode.com" },
  optimism: { chain: optimism, url: "https://optimism.publicnode.com" },
  polygon: { chain: polygon, url: "https://polygon-bor.publicnode.com" },
  avalanche: { chain: avalanche, url: "https://avalanche-c-chain.publicnode.com" },
  "binance-smart-chain": { chain: bsc, url: "https://bsc.publicnode.com" },
};

type Row = { chain: string; protocol: string; address: string; status: string };

function clientFor(chain: string): PublicClient {
  const spec = CHAINS[chain];
  return createPublicClient({
    chain: spec.chain,
    transport: http(spec.url, { timeout: 20_000 }),
  });
}

async function callBatch(client: PublicClient, contracts: Parameters<PublicClient["multicall"]>[0]["contracts"]) {
  const out: { status: string; result?: unknown }[] = [];
  for (let index = 0; index < contracts.length; index += 60) {
    const batch = await client.multicall({ allowFailure: true, contracts: contracts.slice(index, index + 60) });
    out.push(...batch);
  }
  return out;
}

async function identities(client: PublicClient, addresses: Address[]) {
  const first = await callBatch(
    client,
    addresses.flatMap((address) => [
      { address, abi: stringAbi, functionName: "symbol" as const },
      { address, abi: stringAbi, functionName: "decimals" as const },
    ]),
  );
  const failed: Address[] = [];
  const found = new Map<string, { symbol: string | null; decimals: number | null }>();
  addresses.forEach((address, index) => {
    const symbol = first[index * 2];
    const decimals = first[index * 2 + 1];
    const row = {
      symbol: symbol?.status === "success" ? String(symbol.result) : null,
      decimals: decimals?.status === "success" ? Number(decimals.result) : null,
    };
    found.set(address.toLowerCase(), row);
    if (!row.symbol) failed.push(address);
  });
  if (failed.length > 0) {
    const second = await callBatch(
      client,
      failed.map((address) => ({ address, abi: bytesAbi, functionName: "symbol" as const })),
    );
    failed.forEach((address, index) => {
      const row = found.get(address.toLowerCase());
      const result = second[index];
      if (row && result?.status === "success") row.symbol = bytes32Symbol(result.result as `0x${string}`);
    });
  }
  return found;
}

describe.skipIf(!live)("on-chain address catalog", () => {
  it(
    "matches code, symbol, decimals, and the protocol's own token list",
    async () => {
      const probe = clientFor("ethereum");
      try {
        await probe.getBlockNumber();
      } catch (error) {
        console.warn(`verify:addresses skipped, RPC unavailable: ${error instanceof Error ? error.message : "unknown"}`);
        return;
      }

      const rows: Row[] = [];
      const problems: string[] = [];

      for (const chain of Object.keys(CHAINS)) {
        const client = clientFor(chain);
        const market = AAVE_MARKETS[chain];
        if (market) {
          const code = await client.getBytecode({ address: market.pool as Address });
          const poolOk = Boolean(code && code !== "0x");
          rows.push({
            chain,
            protocol: "Aave v3 pool",
            address: market.pool,
            status: poolOk ? "ok" : "no code",
          });
          if (!poolOk) problems.push(`${chain} Aave pool has no code`);

          let listed = new Set<string>();
          try {
            const reserves = await client.readContract({
              address: market.pool as Address,
              abi: stringAbi,
              functionName: "getReservesList",
            });
            listed = new Set((reserves as readonly string[]).map((item) => item.toLowerCase()));
          } catch {
            problems.push(`${chain} Aave pool getReservesList failed`);
          }

          const tokenCalls = market.reserves.map((reserve) => ({
            address: market.dataProvider as Address,
            abi: stringAbi,
            functionName: "getReserveTokensAddresses" as const,
            args: [reserve.underlying as Address] as const,
          }));
          const listedTokens = await callBatch(client, tokenCalls);
          const underlyingCalls = market.reserves.map((reserve) => ({
            address: reserve.aToken as Address,
            abi: stringAbi,
            functionName: "UNDERLYING_ASSET_ADDRESS" as const,
          }));
          const underlyings = await callBatch(client, underlyingCalls);
          const ids = await identities(client, market.reserves.map((reserve) => reserve.underlying as Address));

          market.reserves.forEach((reserve, index) => {
            const bits: string[] = [];
            if (!listed.has(reserve.underlying.toLowerCase())) bits.push("not in pool reserves");
            const tuple = listedTokens[index];
            if (tuple?.status !== "success") bits.push("data provider call failed");
            else {
              const [aToken, , variableDebt] = tuple.result as readonly string[];
              if (!sameAddress(aToken, reserve.aToken)) bits.push(`aToken ${aToken}`);
              if (!sameAddress(variableDebt, reserve.variableDebtToken)) bits.push(`variableDebt ${variableDebt}`);
            }
            const underlying = underlyings[index];
            if (underlying?.status !== "success" || !sameAddress(String(underlying.result), reserve.underlying)) {
              bits.push("aToken underlying mismatch");
            }
            const id = ids.get(reserve.underlying.toLowerCase());
            const mismatch = identityMismatch(
              { symbol: reserve.symbol, decimals: reserve.decimals },
              id ?? { symbol: null, decimals: null },
            );
            if (mismatch) bits.push(mismatch);
            const status = bits.length === 0 ? "ok" : bits.join("; ");
            rows.push({ chain, protocol: `Aave v3 ${reserve.symbol}`, address: reserve.underlying, status });
            if (bits.length) problems.push(`${chain} Aave ${reserve.symbol}: ${status}`);
          });
        }

        for (const comet of COMPOUND_MARKETS.filter((item) => item.chain === chain)) {
          const code = await client.getBytecode({ address: comet.comet as Address });
          if (!code || code === "0x") {
            rows.push({ chain, protocol: `Compound v3 ${comet.symbol}`, address: comet.comet, status: "no code" });
            problems.push(`${chain} Compound ${comet.symbol} has no code`);
            continue;
          }
          let baseToken = "";
          try {
            baseToken = (await client.readContract({
              address: comet.comet as Address,
              abi: stringAbi,
              functionName: "baseToken",
            })) as string;
          } catch {
            rows.push({ chain, protocol: `Compound v3 ${comet.symbol}`, address: comet.comet, status: "baseToken() failed" });
            problems.push(`${chain} Compound ${comet.symbol} baseToken failed`);
            continue;
          }
          const ids = await identities(client, [comet.underlying as Address]);
          const bits: string[] = [];
          if (!sameAddress(baseToken, comet.underlying)) bits.push(`baseToken ${baseToken}`);
          const mismatch = identityMismatch(
            { symbol: comet.symbol, decimals: comet.decimals },
            ids.get(comet.underlying.toLowerCase()) ?? { symbol: null, decimals: null },
          );
          if (mismatch) bits.push(mismatch);
          const status = bits.length === 0 ? "ok" : bits.join("; ");
          rows.push({ chain, protocol: `Compound v3 ${comet.symbol}`, address: comet.comet, status });
          if (bits.length) problems.push(`${chain} Compound ${comet.symbol}: ${status}`);
        }

        const staking = STAKING_TOKENS.filter((token) => token.chain === chain);
        if (staking.length) {
          const ids = await identities(client, staking.map((token) => token.address as Address));
          for (const token of staking) {
            const code = await client.getBytecode({ address: token.address as Address });
            const mismatch = identityMismatch(
              { symbol: token.symbol, decimals: token.decimals },
              ids.get(token.address.toLowerCase()) ?? { symbol: null, decimals: null },
            );
            const bits = [!code || code === "0x" ? "no code" : null, mismatch].filter(Boolean);
            const status = bits.length === 0 ? "ok" : bits.join("; ");
            rows.push({ chain, protocol: token.protocol, address: token.address, status });
            if (bits.length) problems.push(`${chain} ${token.symbol}: ${status}`);
          }
        }

        const majors = [...(MAJOR_TOKENS[chain] ?? [])];
        if (chain === "base") {
          for (const token of BASE_TOKENS) {
            if (!majors.some((item) => sameAddress(item.address, token.address))) {
              majors.push(token);
            }
          }
        }
        if (majors.length) {
          const ids = await identities(client, majors.map((token) => token.address as Address));
          for (const token of majors) {
            const mismatch = identityMismatch(
              { symbol: token.symbol, decimals: token.decimals },
              ids.get(token.address.toLowerCase()) ?? { symbol: null, decimals: null },
            );
            rows.push({
              chain,
              protocol: `Token ${token.symbol}`,
              address: token.address,
              status: mismatch ?? "ok",
            });
            if (mismatch) problems.push(`${chain} ${token.symbol}: ${mismatch}`);
          }
        }
      }

      writeFileSync("/tmp/address-report.json", JSON.stringify({ rows, problems }, null, 2));
      console.log(`checked ${rows.length} addresses, ${problems.length} problems`);
      expect(problems).toEqual([]);
    },
    180_000,
  );
});
