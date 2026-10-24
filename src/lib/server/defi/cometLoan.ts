import { erc20Abi, parseAbi, type Address, type PublicClient } from "viem";
import { assessLoan, displaySymbol, type CollateralLeg } from "@/lib/defi/liquidation";

const cometAbi = parseAbi([
  "function numAssets() view returns (uint8)",
  "function baseTokenPriceFeed() view returns (address)",
  "function baseScale() view returns (uint256)",
  "function userBasic(address) view returns (int104 principal, uint64 baseTrackingIndex, uint64 baseTrackingAccrued, uint16 assetsIn, uint8 reserved)",
  "function getAssetInfo(uint8 i) view returns (uint8 offset, address asset, address priceFeed, uint64 scale, uint64 borrowCollateralFactor, uint64 liquidateCollateralFactor, uint64 liquidationFactor, uint128 supplyCap)",
  "function getPrice(address) view returns (uint256)",
  "function userCollateral(address, address) view returns (uint128 balance, uint128 reserved)",
]);

const MAX_ASSETS = 16;

export type CometRisk = {
  healthFactor: number | null;
  liquidationPriceUsd: number | null;
  liquidationSymbol: string | null;
  blended: boolean;
  covered: boolean;
};

type Call = {
  address: Address;
  abi: typeof cometAbi | typeof erc20Abi;
  functionName: string;
  args?: readonly unknown[];
};

function asBigint(value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isFinite(value)) return BigInt(Math.trunc(value));
  return BigInt(0);
}

function asAddress(value: unknown): Address | null {
  return typeof value === "string" && value.startsWith("0x") ? (value as Address) : null;
}

async function multi(client: PublicClient, contracts: Call[]) {
  return client.multicall({
    allowFailure: true,
    contracts: contracts as unknown as Parameters<PublicClient["multicall"]>[0]["contracts"],
  });
}

/**
 * Health and liquidation price for one Compound III comet the wallet is borrowing from.
 * Three short multicalls: market header, asset info, then the collateral the user actually holds.
 * Returns null when the comet does not answer, so the caller can leave the row without a figure.
 */
export async function readCometRisk(
  client: PublicClient,
  comet: Address,
  user: Address,
  borrowRaw: bigint,
): Promise<CometRisk | null> {
  if (borrowRaw <= BigInt(0)) return null;
  try {
    const header = await multi(client, [
      { address: comet, abi: cometAbi, functionName: "numAssets" },
      { address: comet, abi: cometAbi, functionName: "baseTokenPriceFeed" },
      { address: comet, abi: cometAbi, functionName: "baseScale" },
      { address: comet, abi: cometAbi, functionName: "userBasic", args: [user] },
    ]);
    if (header.some((row) => row.status !== "success")) return null;
    const assetCount = Number(asBigint(header[0]?.result));
    const priceFeed = asAddress(header[1]?.result);
    const baseScale = asBigint(header[2]?.result);
    const basic = header[3]?.result as readonly unknown[] | undefined;
    const assetsIn = asBigint(basic?.[3]);
    if (!priceFeed || baseScale <= BigInt(0) || !Number.isFinite(assetCount) || assetCount <= 0) return null;

    const count = Math.min(assetCount, MAX_ASSETS);
    const infoCalls: Call[] = [
      { address: comet, abi: cometAbi, functionName: "getPrice", args: [priceFeed] },
    ];
    for (let index = 0; index < count; index += 1) {
      infoCalls.push({ address: comet, abi: cometAbi, functionName: "getAssetInfo", args: [index] });
    }
    const info = await multi(client, infoCalls);
    const basePrice = info[0]?.status === "success" ? asBigint(info[0].result) : BigInt(0);
    if (basePrice <= BigInt(0)) return null;
    const debtUsd8 = (borrowRaw * basePrice) / baseScale;

    type Asset = { asset: Address; priceFeed: Address; scale: bigint; factor: bigint };
    const held: Asset[] = [];
    for (let index = 0; index < count; index += 1) {
      const row = info[index + 1];
      if (row?.status !== "success" || !Array.isArray(row.result)) continue;
      const tuple = row.result as readonly unknown[];
      const offset = Number(asBigint(tuple[0]));
      const asset = asAddress(tuple[1]);
      const priceFeed = asAddress(tuple[2]);
      const scale = asBigint(tuple[3]);
      const factor = asBigint(tuple[5]);
      if (!asset || !priceFeed || scale <= BigInt(0) || !Number.isInteger(offset) || offset < 0 || offset >= 16) continue;
      const bit = BigInt(1) << BigInt(offset);
      if ((assetsIn & bit) === BigInt(0)) continue;
      held.push({ asset, priceFeed, scale, factor });
    }

    const legs: CollateralLeg[] = [];
    if (held.length > 0) {
      const heldCalls: Call[] = held.flatMap((asset) => [
        { address: comet, abi: cometAbi, functionName: "userCollateral", args: [user, asset.asset] },
        { address: comet, abi: cometAbi, functionName: "getPrice", args: [asset.priceFeed] },
        { address: asset.asset, abi: erc20Abi, functionName: "symbol" },
      ]);
      const heldResults = await multi(client, heldCalls);
      held.forEach((asset, index) => {
        const balanceRow = heldResults[index * 3];
        const priceRow = heldResults[index * 3 + 1];
        const symbolRow = heldResults[index * 3 + 2];
        const balance = balanceRow?.status === "success" ? asBigint((balanceRow.result as readonly unknown[])?.[0]) : BigInt(0);
        const price = priceRow?.status === "success" ? asBigint(priceRow.result) : BigInt(0);
        const symbol = symbolRow?.status === "success" && typeof symbolRow.result === "string" ? symbolRow.result : "collateral";
        if (balance <= BigInt(0) || price <= BigInt(0)) return;
        legs.push({
          symbol: displaySymbol(symbol),
          amountRaw: balance,
          scale: asset.scale,
          factor1e18: asset.factor,
          usd8: (balance * price) / asset.scale,
        });
      });
    }

    const assessed = assessLoan(debtUsd8, legs);
    return {
      healthFactor: assessed.healthFactor,
      liquidationPriceUsd: assessed.liquidationPriceUsd,
      liquidationSymbol: assessed.liquidationSymbol,
      blended: assessed.blended,
      covered: assessed.coveredByOtherCollateral,
    };
  } catch {
    return null;
  }
}
