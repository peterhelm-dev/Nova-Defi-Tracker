"use client";

import { useMemo } from "react";
import { buildHoldings, sumHoldingsUsd } from "@/lib/holdings";
import { useTokenBalances } from "./useTokenBalances";
import { useTokenPrices } from "./useTokenPrices";

export function useWalletHoldings() {
  const { address, ethBalance, erc20Balances, isLoading: balancesLoading } =
    useTokenBalances();
  const {
    data: prices,
    isLoading: pricesLoading,
    isError: pricesUnavailable,
    dataUpdatedAt: pricesUpdatedAt,
  } = useTokenPrices();

  const holdings = useMemo(() => {
    if (!address) return [];
    return buildHoldings({
      ethFormattedBalance: ethBalance.data?.formatted,
      erc20Results: erc20Balances.data,
      prices,
    });
  }, [address, ethBalance.data, erc20Balances.data, prices]);

  const totalUsd = useMemo(() => sumHoldingsUsd(holdings), [holdings]);

  return {
    address,
    holdings,
    totalUsd,
    isLoading: balancesLoading || (!!address && pricesLoading),
    pricesUnavailable,
    pricesUpdatedAt,
  };
}
