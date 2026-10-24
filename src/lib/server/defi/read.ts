import { unstable_cache } from "next/cache";
import { erc20Abi, formatUnits, parseAbi, type Address } from "viem";
import { applyDefiReadings, isMeaningfulBalance, type DefiKind, type DefiReading } from "@/lib/defi/applyPositions";
import { assessAaveAccount } from "@/lib/defi/liquidation";
import { AAVE_MARKETS, COMPOUND_MARKETS, STABLE_SYMBOLS, STAKING_TOKENS } from "@/lib/defi/markets";
import { coingeckoPlatform } from "@/lib/coingeckoPlatforms";
import { siteOrigin } from "@/lib/server/prices";
import type { AutoPortfolio } from "@/types";
import { evmClient } from "../evm";
import { readCometRisk, type CometRisk } from "./cometLoan";

const poolAbi = parseAbi([
  "function getUserAccountData(address user) view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)",
]);

const cometAbi = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function borrowBalanceOf(address) view returns (uint256)",
]);

const ALCHEMY_NETWORK: Record<string, string> = {
  ethereum: "eth-mainnet",
  base: "base-mainnet",
  arbitrum: "arb-mainnet",
  optimism: "opt-mainnet",
  polygon: "polygon-mainnet",
  avalanche: "avax-mainnet",
  "binance-smart-chain": "bnb-mainnet",
};

type Job = {
  chain: string;
  protocol: string;
  kind: DefiKind;
  symbol: string;
  receiptAddress: Address;
  priceAddress: Address;
  decimals: number;
  abi: typeof erc20Abi | typeof cometAbi;
  functionName: "balanceOf" | "borrowBalanceOf";
};

function jobsFor(chain: string): Job[] {
  const jobs: Job[] = [];
  const aave = AAVE_MARKETS[chain];
  if (aave) {
    for (const reserve of aave.reserves) {
      jobs.push({
        chain,
        protocol: "Aave",
        kind: "supplied",
        symbol: reserve.symbol,
        receiptAddress: reserve.aToken as Address,
        priceAddress: reserve.underlying as Address,
        decimals: reserve.decimals,
        abi: erc20Abi,
        functionName: "balanceOf",
      });
      jobs.push({
        chain,
        protocol: "Aave",
        kind: "borrowed",
        symbol: reserve.symbol,
        receiptAddress: reserve.variableDebtToken as Address,
        priceAddress: reserve.underlying as Address,
        decimals: reserve.decimals,
        abi: erc20Abi,
        functionName: "balanceOf",
      });
    }
  }
  for (const market of COMPOUND_MARKETS.filter((item) => item.chain === chain)) {
    jobs.push({
      chain,
      protocol: "Compound",
      kind: "supplied",
      symbol: market.symbol,
      receiptAddress: market.comet as Address,
      priceAddress: market.underlying as Address,
      decimals: market.decimals,
      abi: cometAbi,
      functionName: "balanceOf",
    });
    jobs.push({
      chain,
      protocol: "Compound",
      kind: "borrowed",
      symbol: market.symbol,
      receiptAddress: market.comet as Address,
      priceAddress: market.underlying as Address,
      decimals: market.decimals,
      abi: cometAbi,
      functionName: "borrowBalanceOf",
    });
  }
  for (const token of STAKING_TOKENS.filter((item) => item.chain === chain)) {
    jobs.push({
      chain,
      protocol: token.protocol,
      kind: "staked",
      symbol: token.symbol,
      receiptAddress: token.address as Address,
      priceAddress: token.address as Address,
      decimals: token.decimals,
      abi: erc20Abi,
      functionName: "balanceOf",
    });
  }
  return jobs;
}

type AaveSnapshot = {
  chain: string;
  debtUsd8: string;
  collateralUsd8: string;
  thresholdBps: string;
  healthFactor: number | null;
};

function reportedHealth(factor: bigint, debt: bigint): number | null {
  if (debt <= BigInt(0) || factor > BigInt(10) ** BigInt(30)) return null;
  const health = Number(factor) / 1e18;
  return Number.isFinite(health) ? health : null;
}

async function readChain(chain: string, user: Address): Promise<{ readings: DefiReading[]; aave: AaveSnapshot | null }> {
  const jobs = jobsFor(chain);
  if (jobs.length === 0) return { readings: [], aave: null };
  const client = evmClient(chain);
  const raw: bigint[] = [];
  for (let i = 0; i < jobs.length; i += 40) {
    const slice = jobs.slice(i, i + 40);
    const results = await client.multicall({
      allowFailure: true,
      contracts: slice.map((job) => ({
        address: job.receiptAddress,
        abi: job.abi,
        functionName: job.functionName,
        args: [user],
      })),
    });
    for (const result of results) raw.push(result.status === "success" ? (result.result as bigint) : BigInt(0));
  }

  let healthFactor: number | null = null;
  let aave: AaveSnapshot | null = null;
  const borrowed = jobs.some((job, index) => job.protocol === "Aave" && job.kind === "borrowed" && (raw[index] ?? BigInt(0)) > BigInt(0));
  if (borrowed && AAVE_MARKETS[chain]) {
    try {
      const data = await client.readContract({
        address: AAVE_MARKETS[chain].pool as Address,
        abi: poolAbi,
        functionName: "getUserAccountData",
        args: [user],
      });
      const debt = data[1];
      healthFactor = reportedHealth(data[5], debt);
      if (debt > BigInt(0)) {
        aave = {
          chain,
          collateralUsd8: data[0].toString(),
          debtUsd8: debt.toString(),
          thresholdBps: data[3].toString(),
          healthFactor,
        };
      }
    } catch {
      healthFactor = null;
    }
  }

  const cometRisk = new Map<string, CometRisk | null>();
  for (let index = 0; index < jobs.length; index += 1) {
    const job = jobs[index];
    if (!job || job.protocol !== "Compound" || job.kind !== "borrowed") continue;
    const borrowRaw = raw[index] ?? BigInt(0);
    if (borrowRaw <= BigInt(0)) continue;
    cometRisk.set(job.receiptAddress.toLowerCase(), await readCometRisk(client, job.receiptAddress, user, borrowRaw));
  }

  const readings: DefiReading[] = [];
  jobs.forEach((job, index) => {
    const amountRaw = raw[index] ?? BigInt(0);
    if (!isMeaningfulBalance(amountRaw)) return;
    const amount = Number(formatUnits(amountRaw, job.decimals));
    if (!Number.isFinite(amount) || amount <= 0) return;
    const comet = job.protocol === "Compound" ? cometRisk.get(job.receiptAddress.toLowerCase()) : undefined;
    readings.push({
      chain,
      protocol: job.protocol,
      kind: job.kind,
      symbol: job.symbol,
      receiptAddress: job.receiptAddress,
      priceAddress: job.priceAddress,
      amount,
      amountRaw: amountRaw.toString(),
      decimals: job.decimals,
      priceUsd: STABLE_SYMBOLS.has(job.symbol.toUpperCase()) ? 1 : null,
      healthFactor: job.protocol === "Aave" ? healthFactor : comet?.healthFactor ?? null,
      liquidationPriceUsd: comet?.liquidationPriceUsd ?? null,
      liquidationSymbol: comet?.liquidationSymbol ?? null,
      liquidationMarket: job.protocol === "Compound" ? job.symbol : null,
      liquidationBlended: comet?.blended ?? false,
      liquidationCovered: comet?.covered ?? false,
    });
  });
  return { readings, aave };
}

async function ethPrice(): Promise<number | null> {
  const key = process.env.ALCHEMY_API_KEY?.trim();
  try {
    if (key) {
      const res = await fetch(`https://api.g.alchemy.com/prices/v1/${key}/tokens/by-symbol?symbols=ETH`, {
        headers: { accept: "application/json", origin: siteOrigin() },
        cache: "no-store",
      });
      if (res.ok) {
        const json = (await res.json()) as { data?: { symbol?: string; prices?: { currency?: string; value?: string }[] }[] };
        const usd = json.data?.find((item) => item.symbol?.toUpperCase() === "ETH")?.prices?.find((price) => price.currency?.toLowerCase() === "usd");
        const value = Number(usd?.value);
        if (Number.isFinite(value)) return value;
      }
    }
    const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd", { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as { ethereum?: { usd?: number } };
    return typeof json.ethereum?.usd === "number" ? json.ethereum.usd : null;
  } catch {
    return null;
  }
}

async function alchemyTokenPrices(pairs: { chain: string; address: string }[]): Promise<Map<string, number>> {
  const key = process.env.ALCHEMY_API_KEY?.trim();
  const found = new Map<string, number>();
  if (!key || pairs.length === 0) return found;
  const addresses = pairs
    .map((pair) => ({ network: ALCHEMY_NETWORK[pair.chain], address: pair.address }))
    .filter((pair): pair is { network: string; address: string } => Boolean(pair.network));
  for (let i = 0; i < addresses.length; i += 25) {
    const slice = addresses.slice(i, i + 25);
    try {
      const res = await fetch(`https://api.g.alchemy.com/prices/v1/${key}/tokens/by-address`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json", origin: siteOrigin() },
        body: JSON.stringify({ addresses: slice }),
        cache: "no-store",
      });
      if (!res.ok) continue;
      const json = (await res.json()) as { data?: { address?: string; prices?: { currency?: string; value?: string }[] }[] };
      for (const item of json.data ?? []) {
        const usd = item.prices?.find((price) => price.currency?.toLowerCase() === "usd");
        const value = Number(usd?.value);
        if (item.address && Number.isFinite(value)) found.set(item.address.toLowerCase(), value);
      }
    } catch {
      // A missing quote falls through to the holding price.
    }
  }
  return found;
}

async function coinGeckoTokenPrice(chain: string, address: string): Promise<number | null> {
  const platform = coingeckoPlatform(chain);
  if (!platform) return null;
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/token_price/${platform}?contract_addresses=${address}&vs_currencies=usd`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as Record<string, { usd?: number }>;
    const usd = json[address.toLowerCase()]?.usd;
    return typeof usd === "number" ? usd : null;
  } catch {
    return null;
  }
}

async function withPrices(readings: DefiReading[]): Promise<DefiReading[]> {
  if (readings.length === 0) return readings;
  const eth = await ethPrice();
  const need = readings.filter((reading) => reading.priceUsd === null && !["WETH", "ETH"].includes(reading.symbol.toUpperCase()));
  const quoted = await alchemyTokenPrices(need.map((reading) => ({ chain: reading.chain, address: reading.priceAddress })));
  const priced: DefiReading[] = [];
  for (const reading of readings) {
    if (typeof reading.priceUsd === "number") {
      priced.push(reading);
      continue;
    }
    const symbol = reading.symbol.toUpperCase();
    if ((symbol === "WETH" || symbol === "ETH") && eth !== null) {
      priced.push({ ...reading, priceUsd: eth });
      continue;
    }
    const alchemy = quoted.get(reading.priceAddress.toLowerCase());
    if (typeof alchemy === "number") {
      priced.push({ ...reading, priceUsd: alchemy });
      continue;
    }
    const gecko = await coinGeckoTokenPrice(reading.chain, reading.priceAddress);
    priced.push({ ...reading, priceUsd: gecko });
  }
  return priced;
}

function withAaveLiquidation(readings: DefiReading[], snapshots: AaveSnapshot[]): DefiReading[] {
  const stamps = new Map<string, ReturnType<typeof assessAaveAccount>>();
  for (const snapshot of snapshots) {
    const legs = readings
      .filter((reading) => reading.protocol === "Aave" && reading.kind === "supplied" && reading.chain === snapshot.chain && reading.amountRaw)
      .map((reading) => ({
        symbol: reading.symbol,
        amountRaw: BigInt(reading.amountRaw ?? "0"),
        decimals: reading.decimals ?? 18,
        priceUsd: typeof reading.priceUsd === "number" ? reading.priceUsd : null,
      }));
    stamps.set(snapshot.chain, assessAaveAccount({
      debtUsd8: BigInt(snapshot.debtUsd8),
      collateralUsd8: BigInt(snapshot.collateralUsd8),
      thresholdBps: BigInt(snapshot.thresholdBps),
      reportedHealthFactor: snapshot.healthFactor,
      legs,
    }));
  }
  return readings.map((reading) => {
    const stamp = reading.protocol === "Aave" ? stamps.get(reading.chain) : undefined;
    if (!stamp) return reading;
    return {
      ...reading,
      healthFactor: stamp.healthFactor,
      liquidationPriceUsd: stamp.liquidationPriceUsd,
      liquidationSymbol: stamp.liquidationSymbol,
      liquidationMarket: null,
      liquidationBlended: stamp.blended,
      liquidationCovered: stamp.coveredByOtherCollateral,
    };
  });
}

async function readDefiReadings(address: string): Promise<DefiReading[]> {
  const user = address as Address;
  const chains = [...new Set([...Object.keys(AAVE_MARKETS), ...COMPOUND_MARKETS.map((market) => market.chain), ...STAKING_TOKENS.map((token) => token.chain)])];
  const settled = await Promise.all(chains.map(async (chain) => {
    try {
      return await readChain(chain, user);
    } catch (error) {
      console.error(`DeFi read failed on ${chain}`, error instanceof Error ? error.message : "unknown");
      return { readings: [] as DefiReading[], aave: null };
    }
  }));
  const priced = await withPrices(settled.flatMap((chain) => chain.readings));
  const snapshots = settled.flatMap((chain) => (chain.aave ? [chain.aave] : []));
  return withAaveLiquidation(priced, snapshots);
}

const cachedReadings = unstable_cache(readDefiReadings, ["defi-readings-v2"], { revalidate: 300 });

/** Adds Aave, Compound, and staking positions. A failed read leaves the portfolio unchanged. */
export async function attachDetectedPositions(portfolio: AutoPortfolio): Promise<AutoPortfolio> {
  try {
    const readings = await cachedReadings(portfolio.address);
    return applyDefiReadings(portfolio, readings);
  } catch (error) {
    console.error("DeFi detection failed", error instanceof Error ? error.message : "unknown");
    return portfolio;
  }
}
