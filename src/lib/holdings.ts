import { formatUnits } from "viem";
import { BASE_TOKENS, type BaseToken } from "./tokens";
import type { PriceResponse, TokenHolding } from "@/types";

type Erc20BalanceResult = { status: "success" | "failure"; result?: unknown };

export function buildHoldings(params: {
  ethFormattedBalance: string | undefined;
  erc20Results: (Erc20BalanceResult | undefined)[] | undefined;
  prices: PriceResponse | undefined;
  tokens?: BaseToken[];
}): TokenHolding[] {
  const { ethFormattedBalance, erc20Results, prices, tokens = BASE_TOKENS } = params;

  const ethAmount = ethFormattedBalance ? Number(ethFormattedBalance) : 0;
  const ethPrice = prices?.eth?.usd ?? null;
  const ethHolding: TokenHolding = {
    symbol: "ETH",
    name: "Ether",
    address: "native",
    decimals: 18,
    balance: ethAmount,
    priceUsd: ethPrice,
    change24h: prices?.eth?.usd_24h_change ?? null,
    valueUsd: ethPrice ? ethAmount * ethPrice : 0,
  };

  const tokenHoldings: TokenHolding[] = tokens.map((token, index) => {
    const result = erc20Results?.[index];
    const raw =
      result?.status === "success" ? (result.result as bigint) : BigInt(0);
    const balance = Number(formatUnits(raw, token.decimals));
    const priceEntry = prices?.tokens?.[token.address.toLowerCase()];
    const priceUsd = priceEntry?.usd ?? null;

    return {
      symbol: token.symbol,
      name: token.name,
      address: token.address,
      decimals: token.decimals,
      balance,
      priceUsd,
      change24h: priceEntry?.usd_24h_change ?? null,
      valueUsd: priceUsd ? balance * priceUsd : 0,
    };
  });

  return [ethHolding, ...tokenHoldings]
    .filter((holding) => holding.balance > 0)
    .sort((a, b) => b.valueUsd - a.valueUsd);
}

export function sumHoldingsUsd(holdings: TokenHolding[]): number {
  return holdings.reduce((sum, holding) => sum + holding.valueUsd, 0);
}
