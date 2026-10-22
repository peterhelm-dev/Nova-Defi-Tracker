import { describe, expect, it } from "vitest";
import {
  allocationFromGroups,
  applyScope,
  classifyHolding,
  formatMoney,
  groupBalances,
  isDust,
  type TaggedHolding,
} from "./balanceView";
import { mapPoolPoints, mapTokenProfile, mapTokenSearch, searchPools } from "./research";

function holding(partial: Partial<TaggedHolding> & Pick<TaggedHolding, "symbol" | "chain" | "wallet">): TaggedHolding {
  return {
    name: partial.symbol,
    address: partial.address ?? "0xabc",
    decimals: 18,
    iconUrl: null,
    fungibleId: null,
    balance: partial.balance ?? 1,
    priceUsd: partial.priceUsd === undefined ? 1 : partial.priceUsd,
    change24h: partial.change24h ?? 0,
    valueUsd: partial.valueUsd ?? 10,
    ...partial,
  };
}

describe("balance grouping", () => {
  const rows = [
    holding({ symbol: "ETH", chain: "ethereum", wallet: "Main", address: "native", valueUsd: 100, balance: 1 }),
    holding({ symbol: "ETH", chain: "base", wallet: "Main", address: "native", valueUsd: 40, balance: 0.4 }),
    holding({ symbol: "USDC", chain: "base", wallet: "Cold", address: "0xusdc", valueUsd: 25, balance: 25 }),
    holding({ symbol: "AERO", chain: "base", wallet: "Cold", address: "0xaero", valueUsd: 0.2, priceUsd: 0.2, balance: 1 }),
    holding({ symbol: "DUST", chain: "ethereum", wallet: "Main", address: "0xdust", valueUsd: 4, priceUsd: null, balance: 100 }),
  ];

  it("groups by token, chain, wallet, and asset type", () => {
    const byToken = groupBalances({ holdings: rows, groupBy: "token", hideDust: false, sort: "value" });
    expect(byToken.map((group) => group.label)).toEqual(["ETH", "USDC", "DUST", "AERO"]);
    expect(byToken[0].valueUsd).toBe(140);
    expect(byToken[0].items).toHaveLength(2);

    const byChain = groupBalances({
      holdings: rows,
      defi: [{ id: "p", label: "Aave", valueUsd: 30, chain: "ethereum" }],
      groupBy: "chain",
      hideDust: false,
      sort: "value",
    });
    expect(byChain.find((group) => group.id === "ethereum")?.valueUsd).toBe(134);

    const byWallet = groupBalances({ holdings: applyScope(rows, "per-wallet"), groupBy: "wallet", hideDust: false, sort: "name" });
    expect(byWallet.map((group) => group.label)).toEqual(["Cold", "Main"]);

    const byType = groupBalances({
      holdings: rows,
      defi: [{ id: "p", label: "Aave", valueUsd: 30, chain: "ethereum" }],
      groupBy: "type",
      hideDust: false,
      sort: "value",
    });
    expect(byType.map((group) => group.id)).toContain("stable");
    expect(byType.find((group) => group.id === "defi")?.valueUsd).toBe(30);
    expect(classifyHolding(rows[0])).toBe("native");
    expect(classifyHolding(rows[2])).toBe("stable");
  });

  it("hides unpriced and sub-dollar balances, and allocation follows the groups", () => {
    expect(isDust(rows[3])).toBe(true);
    expect(isDust(rows[4])).toBe(true);
    const groups = groupBalances({ holdings: rows, groupBy: "token", hideDust: true, sort: "value" });
    expect(groups.map((group) => group.label)).toEqual(["ETH", "USDC"]);
    expect(allocationFromGroups(groups).map((slice) => slice.name)).toEqual(["ETH", "USDC"]);
  });

  it("combines the same token across wallets without dropping a per-wallet view", () => {
    const split = [
      holding({ symbol: "USDC", chain: "ethereum", wallet: "Main", address: "0xusdc", valueUsd: 10, balance: 10 }),
      holding({ symbol: "USDC", chain: "ethereum", wallet: "Cold", address: "0xusdc", valueUsd: 15, balance: 15 }),
    ];
    expect(applyScope(split, "combined")).toHaveLength(1);
    expect(applyScope(split, "combined")[0].valueUsd).toBe(25);
    expect(applyScope(split, "per-wallet")).toHaveLength(2);
  });

  it("converts USD into fiat and coin units", () => {
    const rates = { eurPerUsd: 0.9, gbpPerUsd: 0.8, jpyPerUsd: 150, ethUsd: 2000, btcUsd: 60000 };
    expect(formatMoney(100, "USD", rates)).toBe("$100.00");
    expect(formatMoney(100, "EUR", rates)).toBe("€90.00");
    expect(formatMoney(100, "JPY", rates)).toBe("¥15,000");
    expect(formatMoney(1000, "ETH", rates)).toBe("0.5 ETH");
    expect(formatMoney(100, "EUR", null)).toBe("$100.00");
  });
});

describe("research mappers", () => {
  it("reads a CoinGecko search and coin payload", () => {
    expect(
      mapTokenSearch({
        coins: [
          { id: "ethereum", symbol: "eth", name: "Ethereum", thumb: "https://example/eth.png" },
          { id: "nope" },
        ],
      }),
    ).toEqual([{ id: "ethereum", symbol: "ETH", name: "Ethereum", image: "https://example/eth.png" }]);

    expect(
      mapTokenSearch({
        coins: [
          { id: "vault", symbol: "vUSDC", name: "Some Vault", market_cap_rank: 900 },
          { id: "usd-coin", symbol: "usdc", name: "USDC", market_cap_rank: 6 },
        ],
      }).map((hit) => hit.id),
    ).toEqual(["usd-coin", "vault"]);

    const profile = mapTokenProfile({
      id: "usd-coin",
      symbol: "usdc",
      name: "USDC",
      image: { large: "https://example/usdc.png" },
      market_data: {
        current_price: { usd: 1 },
        market_cap: { usd: 20 },
        total_volume: { usd: 5 },
        circulating_supply: 20,
        total_supply: 21,
        price_change_percentage_24h: 0.1,
      },
      platforms: { ethereum: "0xabc", base: "" },
    });
    expect(profile?.marketCap).toBe(20);
    expect(profile?.contracts).toEqual([{ chain: "Ethereum", address: "0xabc" }]);
  });

  it("filters pools and keeps the recent APY history", () => {
    const pools = [
      { id: "1", project: "aave-v3", symbol: "USDC", chain: "Ethereum", tvlUsd: 10, apy: 4, apyBase: 3, apyReward: 1 },
      { id: "2", project: "aerodrome", symbol: "ETH-USDC", chain: "Base", tvlUsd: 8, apy: 9, apyBase: 9, apyReward: null },
    ];
    expect(searchPools(pools, "aave").map((pool) => pool.id)).toEqual(["1"]);
    expect(searchPools(pools, "e")).toEqual([]);
    const points = mapPoolPoints({
      data: [
        { timestamp: "2026-01-01T00:00:00Z", tvlUsd: 10, apy: 4, apyBase: 3, apyReward: 1 },
        { timestamp: "nope" },
      ],
    });
    expect(points).toHaveLength(1);
    expect(points[0].apyBase).toBe(3);
  });
});
