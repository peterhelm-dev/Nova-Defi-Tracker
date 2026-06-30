"use client";

import { erc20Abi } from "viem";
import { useAccount, useBalance, useReadContracts } from "wagmi";
import { base } from "wagmi/chains";
import { BASE_TOKENS } from "@/lib/tokens";

export function useTokenBalances() {
  const { address } = useAccount();

  const ethBalance = useBalance({
    address,
    chainId: base.id,
    query: { enabled: !!address, refetchInterval: 30_000 },
  });

  const erc20Balances = useReadContracts({
    contracts: BASE_TOKENS.map((token) => ({
      address: token.address,
      abi: erc20Abi,
      functionName: "balanceOf" as const,
      args: address ? [address] : undefined,
      chainId: base.id,
    })),
    allowFailure: true,
    query: { enabled: !!address, refetchInterval: 30_000 },
  });

  return {
    address,
    ethBalance,
    erc20Balances,
    isLoading: !!address && (ethBalance.isLoading || erc20Balances.isLoading),
  };
}
