import { erc20Abi, formatUnits, type Address } from "viem";
import { buildHoldings, sumHoldingsUsd } from "@/lib/holdings";
import { BASE_TOKENS } from "@/lib/tokens";
import { fetchPrices } from "./prices";
import { getPublicClient } from "./viemClient";

/**
 * Computes a wallet's USD value on Base server-side — the same math the client
 * does, but driven by the server Base client (native balance + an ERC-20
 * multicall) and CoinGecko. Used by the scheduled snapshot job so net-worth
 * history accrues even when the user isn't visiting. Returns null if prices
 * are unavailable (so the caller can skip writing a misleading snapshot).
 */
export async function computeWalletUsd(address: Address): Promise<number | null> {
  const client = getPublicClient();

  const [ethBalance, erc20Results, prices] = await Promise.all([
    client.getBalance({ address }),
    client.multicall({
      contracts: BASE_TOKENS.map((token) => ({
        address: token.address,
        abi: erc20Abi,
        functionName: "balanceOf" as const,
        args: [address] as const,
      })),
      allowFailure: true,
    }),
    fetchPrices(),
  ]);

  if (!prices) return null;

  const holdings = buildHoldings({
    ethFormattedBalance: formatUnits(ethBalance, 18),
    erc20Results,
    prices,
  });

  return sumHoldingsUsd(holdings);
}
