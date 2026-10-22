import { describe, expect, it } from "vitest";
import type { AutoPortfolio, TokenHolding } from "@/types";
import { AAVE_MARKETS, positionLabel } from "./markets";
import { applyDefiReadings, isMeaningfulBalance, type DefiReading } from "./applyPositions";

function token(partial: Partial<TokenHolding> & Pick<TokenHolding, "symbol" | "address" | "valueUsd">): TokenHolding {
  return {
    name: partial.symbol,
    decimals: 18,
    chain: "ethereum",
    iconUrl: null,
    fungibleId: null,
    balance: partial.balance ?? 1,
    priceUsd: partial.priceUsd ?? 1,
    change24h: null,
    ...partial,
  };
}

function portfolio(tokens: TokenHolding[], positions: AutoPortfolio["positions"] = []): AutoPortfolio {
  const walletUsd = tokens.reduce((sum, item) => sum + item.valueUsd, 0);
  return {
    address: "0xabc",
    tokens,
    positions,
    walletUsd,
    defiUsd: positions.reduce((sum, position) => sum + position.valueUsd, 0),
    totalUsd: walletUsd,
    chains: ["ethereum"],
    provider: "alchemy",
    updatedAt: 1,
  };
}

describe("Aave market snapshot", () => {
  it("keeps the official Ethereum and Base USDC aTokens", () => {
    const eth = AAVE_MARKETS.ethereum.reserves.find((reserve) => reserve.symbol === "USDC");
    const base = AAVE_MARKETS.base.reserves.find((reserve) => reserve.symbol === "USDC");
    expect(eth?.aToken).toBe("0x98C23E9d8f34FEFb1B7BD6a91B7FF122F4e16F5c");
    expect(eth?.variableDebtToken).toBe("0x72E95b8931767C79bA4EeE721354d6E99a61D004");
    expect(base?.aToken).toBe("0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB");
  });
});

describe("applyDefiReadings", () => {
  const aToken = "0x98C23E9d8f34FEFb1B7BD6a91B7FF122F4e16F5c";
  const debt = "0x72E95b8931767C79bA4EeE721354d6E99a61D004";

  it("labels Aave supply and borrow, and does not count the receipt token twice", () => {
    const readings: DefiReading[] = [
      {
        chain: "ethereum",
        protocol: "Aave",
        kind: "supplied",
        symbol: "USDC",
        receiptAddress: aToken,
        priceAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        amount: 1000,
        healthFactor: 1.8,
      },
      {
        chain: "ethereum",
        protocol: "Aave",
        kind: "borrowed",
        symbol: "WETH",
        receiptAddress: debt,
        priceAddress: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        amount: 0.5,
        healthFactor: 1.8,
      },
    ];
    const next = applyDefiReadings(
      portfolio([
        token({ symbol: "aEthUSDC", address: aToken, balance: 1000, priceUsd: 1, valueUsd: 1000 }),
        token({ symbol: "ETH", address: "native", balance: 1, priceUsd: 2000, valueUsd: 2000 }),
      ]),
      readings,
    );

    expect(next.tokens.map((item) => item.symbol)).toEqual(["ETH"]);
    expect(next.positions.map((position) => position.name)).toEqual([
      "Aave · USDC supplied",
      "Aave · ETH borrowed",
    ]);
    expect(next.positions[0]?.valueUsd).toBe(1000);
    expect(next.positions[1]?.valueUsd).toBe(-1000);
    expect(next.positions[0]?.healthFactor).toBe(1.8);
    expect(next.walletUsd).toBe(2000);
    expect(next.defiUsd).toBe(0);
    expect(next.totalUsd).toBe(2000);
  });

  it("moves a staking token out of plain holdings", () => {
    const steth = "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84";
    const next = applyDefiReadings(
      portfolio([token({ symbol: "stETH", address: steth, balance: 2, priceUsd: 2000, valueUsd: 4000 })]),
      [
        {
          chain: "ethereum",
          protocol: "Lido",
          kind: "staked",
          symbol: "stETH",
          receiptAddress: steth,
          priceAddress: steth,
          amount: 2,
        },
      ],
    );
    expect(next.tokens).toHaveLength(0);
    expect(next.positions[0]?.name).toBe("Lido · stETH staked");
    expect(next.positions[0]?.kind).toBe("staked");
    expect(next.defiUsd).toBe(4000);
    expect(next.totalUsd).toBe(4000);
  });

  it("does not add a second Aave row when the indexer already has that position", () => {
    const next = applyDefiReadings(
      portfolio([], [
        {
          id: "zerion",
          chain: "ethereum",
          protocol: "Aave V3",
          protocolIconUrl: null,
          kind: "deposit",
          symbol: "USDC",
          name: "USD Coin",
          iconUrl: null,
          groupId: null,
          valueUsd: 50,
        },
      ]),
      [
        {
          chain: "ethereum",
          protocol: "Aave",
          kind: "supplied",
          symbol: "USDC",
          receiptAddress: aToken,
          priceAddress: aToken,
          amount: 50,
          priceUsd: 1,
        },
      ],
    );
    expect(next.positions).toHaveLength(1);
    expect(next.positions[0]?.valueUsd).toBe(50);
  });

  it("drops a priced leftover under one cent and keeps an unpriced balance", () => {
    const next = applyDefiReadings(portfolio([]), [
      {
        chain: "base",
        protocol: "Lido",
        kind: "staked",
        symbol: "wstETH",
        receiptAddress: "0xwsteth",
        priceAddress: "0xwsteth",
        amount: 0.000000001,
        priceUsd: 3000,
      },
      {
        chain: "ethereum",
        protocol: "Aave",
        kind: "supplied",
        symbol: "RARE",
        receiptAddress: "0xrare",
        priceAddress: "0xrare",
        amount: 12,
        priceUsd: null,
      },
    ]);
    expect(next.positions.map((position) => position.symbol)).toEqual(["RARE"]);
  });
});

describe("isMeaningfulBalance", () => {
  it("drops a 1-wei leftover and keeps a real balance", () => {
    expect(isMeaningfulBalance(BigInt(1))).toBe(false);
    expect(isMeaningfulBalance(BigInt(1000))).toBe(true);
  });
});

describe("positionLabel", () => {
  it("says supplied, borrowed, and staked in plain language", () => {
    expect(positionLabel("Aave", "USDC", "supplied")).toBe("Aave · USDC supplied");
    expect(positionLabel("Aave", "WETH", "borrowed")).toBe("Aave · ETH borrowed");
    expect(positionLabel("Lido", "stETH", "staked")).toBe("Lido · stETH staked");
  });
});
