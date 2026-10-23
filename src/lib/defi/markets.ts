import aaveMarketsJson from "./aaveMarkets.json";

/**
 * Canonical Aave v3 markets on the chains Novafolio already tracks.
 * aToken addresses come from Aave's official token list (bgd-labs/aave-address-book,
 * tag aTokenV3, canonical pool only). variableDebtToken addresses were read from
 * each market's AaveProtocolDataProvider.getReserveTokensAddresses on 22 Oct 2026.
 * Compound markets are the comet addresses in compound-finance/comet deployments.
 */

export type AaveReserve = {
  symbol: string;
  underlying: string;
  aToken: string;
  variableDebtToken: string;
  decimals: number;
};

export type AaveMarket = {
  pool: string;
  dataProvider: string;
  reserves: AaveReserve[];
};

export type CometMarket = {
  chain: string;
  comet: string;
  symbol: string;
  underlying: string;
  decimals: number;
};

export type StakingToken = {
  chain: string;
  protocol: string;
  symbol: string;
  address: string;
  decimals: number;
};

export const AAVE_MARKETS = aaveMarketsJson as Record<string, AaveMarket>;

/** Official Compound III comets. Supply is comet.balanceOf; debt is borrowBalanceOf. */
export const COMPOUND_MARKETS: CometMarket[] = [
  { chain: "ethereum", comet: "0xc3d688B66703497DAA19211EEdff47f25384cdc3", symbol: "USDC", underlying: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6 },
  { chain: "ethereum", comet: "0xA17581A9E3356d9A858b789D68B4d866e593aE94", symbol: "WETH", underlying: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", decimals: 18 },
  { chain: "ethereum", comet: "0x3Afdc9BCA9213A35503b077a6072F3D0d5AB0840", symbol: "USDT", underlying: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6 },
  { chain: "ethereum", comet: "0x3D0bb1ccaB520A66e607822fC55BC921738fAFE3", symbol: "wstETH", underlying: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0", decimals: 18 },
  { chain: "base", comet: "0xb125E6687d4313864e53df431d5425969c15Eb2F", symbol: "USDC", underlying: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", decimals: 6 },
  { chain: "base", comet: "0x46e6b214b524310239732D51387075E0e70970bf", symbol: "WETH", underlying: "0x4200000000000000000000000000000000000006", decimals: 18 },
  { chain: "base", comet: "0x2c776041CCFe903071AF44aa147368a9c8EEA518", symbol: "USDS", underlying: "0x820C137fa70C8691f0e44Dc420a5e53c168921Dc", decimals: 18 },
  { chain: "base", comet: "0x784efeB622244d2348d4F2522f8860B96fbEcE89", symbol: "AERO", underlying: "0x940181a94A35A4569E4529A3CDfB74e38FD98631", decimals: 18 },
  { chain: "arbitrum", comet: "0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf", symbol: "USDC", underlying: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", decimals: 6 },
  { chain: "arbitrum", comet: "0xd98Be00b5D27fc98112BdE293e487f8D4cA57d07", symbol: "USD₮0", underlying: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", decimals: 6 },
  { chain: "arbitrum", comet: "0x6f7D514bbD4aFf3BcD1140B7344b32f063dEe486", symbol: "WETH", underlying: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", decimals: 18 },
  { chain: "optimism", comet: "0x2e44e174f7D53F0212823acC11C01A11d58c5bCB", symbol: "USDC", underlying: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", decimals: 6 },
  { chain: "optimism", comet: "0x995E394b8B2437aC8Ce61Ee0bC610D617962B214", symbol: "USDT", underlying: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58", decimals: 6 },
  { chain: "optimism", comet: "0xE36A30D249f7761327fd973001A32010b521b6Fd", symbol: "WETH", underlying: "0x4200000000000000000000000000000000000006", decimals: 18 },
  { chain: "polygon", comet: "0xF25212E676D1F7F89Cd72fFEe66158f541246445", symbol: "USDC", underlying: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", decimals: 6 },
];

/** Liquid staking tokens. The token in the wallet is the position, so it leaves plain holdings. */
export const STAKING_TOKENS: StakingToken[] = [
  { chain: "ethereum", protocol: "Lido", symbol: "stETH", address: "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84", decimals: 18 },
  { chain: "ethereum", protocol: "Lido", symbol: "wstETH", address: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0", decimals: 18 },
  { chain: "ethereum", protocol: "Rocket Pool", symbol: "rETH", address: "0xae78736Cd615f374D3085123A210448E74Fc6393", decimals: 18 },
  { chain: "ethereum", protocol: "Coinbase", symbol: "cbETH", address: "0xBe9895146f7AF43049ca1c1AE358B0541Ea49704", decimals: 18 },
  { chain: "ethereum", protocol: "Ether.fi", symbol: "weETH", address: "0xCd5fE23C85820F7B72D0926FC9b05b43E359b7ee", decimals: 18 },
  { chain: "base", protocol: "Coinbase", symbol: "cbETH", address: "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22", decimals: 18 },
  { chain: "base", protocol: "Lido", symbol: "wstETH", address: "0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452", decimals: 18 },
  { chain: "base", protocol: "Ether.fi", symbol: "weETH", address: "0x04C0599Ae5A44757c0af6F9eC3b93da8976c150A", decimals: 18 },
  { chain: "arbitrum", protocol: "Lido", symbol: "wstETH", address: "0x5979D7b546E38E414F7E9822514be443A4800529", decimals: 18 },
  { chain: "arbitrum", protocol: "Rocket Pool", symbol: "rETH", address: "0xEC70Dcb4A1EFa46b8F2D97C310C9c4790ba5ffA8", decimals: 18 },
  { chain: "arbitrum", protocol: "Ether.fi", symbol: "weETH", address: "0x35751007a407ca6FEFfE80b3cB397736D2cf4dbe", decimals: 18 },
  { chain: "optimism", protocol: "Lido", symbol: "wstETH", address: "0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb", decimals: 18 },
  { chain: "polygon", protocol: "Lido", symbol: "wstETH", address: "0x03b54A6e9a984069379fae1a4fC4dBAE93B3bCCD", decimals: 18 },
];

export const STABLE_SYMBOLS = new Set([
  "USDC",
  "USDT",
  "DAI",
  "USDBC",
  "USDS",
  "GHO",
  "LUSD",
  "FRAX",
  "PYUSD",
  "CRVUSD",
  "USDE",
  "USDT0",
  "USD₮0",
]);

export function positionLabel(protocol: string, symbol: string, kind: "supplied" | "borrowed" | "staked"): string {
  const shown = symbol.toUpperCase() === "WETH" ? "ETH" : symbol;
  const verb = kind === "supplied" ? "supplied" : kind === "borrowed" ? "borrowed" : "staked";
  return `${protocol} · ${shown} ${verb}`;
}
