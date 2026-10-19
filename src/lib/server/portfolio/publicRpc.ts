import { unstable_cache } from "next/cache";
import {
  createPublicClient,
  erc20Abi,
  formatUnits,
  http,
  type Address,
  type Chain,
} from "viem";
import {
  arbitrum,
  avalanche,
  base,
  bsc,
  mainnet,
  optimism,
  polygon,
} from "viem/chains";
import type { AutoPortfolio, TokenHolding } from "@/types";
import type { PortfolioProvider } from "./provider";

/**
 * No-key fallback. Reads native balances plus a short list of major tokens
 * from public RPCs and prices them with CoinGecko's free endpoint (stables
 * are treated as $1). This is not full detection — a wallet full of long-tail
 * tokens will look smaller until ALCHEMY_API_KEY is set.
 */

const CACHE_SECONDS = 300;
const RPC_TIMEOUT = 8_000;

type MajorToken = { symbol: string; name: string; address: Address; decimals: number };

type ChainSpec = {
  id: string;
  chain: Chain;
  rpc: string;
  native: { symbol: string; name: string; coinId: string };
  tokens: MajorToken[];
};

const CHAINS: ChainSpec[] = [
  {
    id: "ethereum",
    chain: mainnet,
    rpc: "https://ethereum.publicnode.com",
    native: { symbol: "ETH", name: "Ethereum", coinId: "ethereum" },
    tokens: [
      { symbol: "WETH", name: "Wrapped Ether", address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", decimals: 18 },
      { symbol: "USDC", name: "USD Coin", address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6 },
      { symbol: "USDT", name: "Tether", address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6 },
      { symbol: "DAI", name: "Dai", address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", decimals: 18 },
      { symbol: "WBTC", name: "Wrapped Bitcoin", address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", decimals: 8 },
    ],
  },
  {
    id: "base",
    chain: base,
    rpc: "https://base.publicnode.com",
    native: { symbol: "ETH", name: "Ethereum", coinId: "ethereum" },
    tokens: [
      { symbol: "WETH", name: "Wrapped Ether", address: "0x4200000000000000000000000000000000000006", decimals: 18 },
      { symbol: "USDC", name: "USD Coin", address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", decimals: 6 },
    ],
  },
  {
    id: "arbitrum",
    chain: arbitrum,
    rpc: "https://arbitrum-one.publicnode.com",
    native: { symbol: "ETH", name: "Ethereum", coinId: "ethereum" },
    tokens: [
      { symbol: "WETH", name: "Wrapped Ether", address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", decimals: 18 },
      { symbol: "USDC", name: "USD Coin", address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", decimals: 6 },
      { symbol: "ARB", name: "Arbitrum", address: "0x912CE59144191C1204E64559FE8253a0e49E6548", decimals: 18 },
    ],
  },
  {
    id: "optimism",
    chain: optimism,
    rpc: "https://optimism.publicnode.com",
    native: { symbol: "ETH", name: "Ethereum", coinId: "ethereum" },
    tokens: [
      { symbol: "WETH", name: "Wrapped Ether", address: "0x4200000000000000000000000000000000000006", decimals: 18 },
      { symbol: "USDC", name: "USD Coin", address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", decimals: 6 },
      { symbol: "OP", name: "Optimism", address: "0x4200000000000000000000000000000000000042", decimals: 18 },
    ],
  },
  {
    id: "polygon",
    chain: polygon,
    rpc: "https://polygon-bor.publicnode.com",
    native: { symbol: "POL", name: "Polygon", coinId: "matic-network" },
    tokens: [
      { symbol: "WETH", name: "Wrapped Ether", address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", decimals: 18 },
      { symbol: "USDC", name: "USD Coin", address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", decimals: 6 },
    ],
  },
  {
    id: "binance-smart-chain",
    chain: bsc,
    rpc: "https://bsc.publicnode.com",
    native: { symbol: "BNB", name: "BNB", coinId: "binancecoin" },
    tokens: [
      { symbol: "WBNB", name: "Wrapped BNB", address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", decimals: 18 },
      { symbol: "USDC", name: "USD Coin", address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", decimals: 18 },
      { symbol: "USDT", name: "Tether", address: "0x55d398326f99059fF775485246999027B3197955", decimals: 18 },
    ],
  },
  {
    id: "avalanche",
    chain: avalanche,
    rpc: "https://avalanche-c-chain.publicnode.com",
    native: { symbol: "AVAX", name: "Avalanche", coinId: "avalanche-2" },
    tokens: [
      { symbol: "WAVAX", name: "Wrapped AVAX", address: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", decimals: 18 },
      { symbol: "USDC", name: "USD Coin", address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", decimals: 6 },
    ],
  },
];

const COIN_IDS = [
  "ethereum",
  "matic-network",
  "binancecoin",
  "avalanche-2",
  "arbitrum",
  "optimism",
  "bitcoin",
];

type CoinPrice = { usd?: number; usd_24h_change?: number };

async function fetchCoinPrices(): Promise<Record<string, CoinPrice>> {
  const url =
    `https://api.coingecko.com/api/v3/simple/price?ids=${COIN_IDS.join(",")}` +
    "&vs_currencies=usd&include_24hr_change=true";
  const headers: HeadersInit = {};
  const key = process.env.COINGECKO_API_KEY;
  if (key && process.env.COINGECKO_PLAN !== "pro") headers["x-cg-demo-api-key"] = key;

  const res = await fetch(url, { headers, cache: "no-store" });
  if (!res.ok) return {};
  return (await res.json()) as Record<string, CoinPrice>;
}

function priceFor(symbol: string, coinId: string | undefined, prices: Record<string, CoinPrice>) {
  if (symbol === "USDC" || symbol === "USDT" || symbol === "DAI") {
    return { priceUsd: 1, change24h: 0 };
  }
  const id =
    symbol === "WBTC" ? "bitcoin" : symbol === "ARB" ? "arbitrum" : symbol === "OP" ? "optimism" : coinId;
  if (!id) return { priceUsd: null, change24h: null };
  const quote = prices[id];
  return {
    priceUsd: typeof quote?.usd === "number" ? quote.usd : null,
    change24h: typeof quote?.usd_24h_change === "number" ? quote.usd_24h_change : null,
  };
}

async function readChain(
  spec: ChainSpec,
  address: Address,
  prices: Record<string, CoinPrice>,
): Promise<TokenHolding[]> {
  const client = createPublicClient({
    chain: spec.chain,
    transport: http(spec.rpc, { timeout: RPC_TIMEOUT }),
  });

  const [native, tokens] = await Promise.all([
    client.getBalance({ address }),
    client.multicall({
      contracts: spec.tokens.map((token) => ({
        address: token.address,
        abi: erc20Abi,
        functionName: "balanceOf" as const,
        args: [address] as const,
      })),
      allowFailure: true,
    }),
  ]);

  const holdings: TokenHolding[] = [];
  const nativeBalance = Number(formatUnits(native, 18));
  if (nativeBalance > 0) {
    const quote = priceFor(spec.native.symbol, spec.native.coinId, prices);
    const valueUsd = quote.priceUsd !== null ? nativeBalance * quote.priceUsd : 0;
    if (quote.priceUsd === null || valueUsd >= 0.01) {
      holdings.push({
        symbol: spec.native.symbol,
        name: spec.native.name,
        address: "native",
        decimals: 18,
        chain: spec.id,
        iconUrl: null,
        fungibleId: null,
        balance: nativeBalance,
        priceUsd: quote.priceUsd,
        change24h: quote.change24h,
        valueUsd,
      });
    }
  }

  spec.tokens.forEach((token, index) => {
    const result = tokens[index];
    if (!result || result.status !== "success") return;
    const balance = Number(formatUnits(result.result, token.decimals));
    if (balance <= 0) return;
    const nativeCoin = token.symbol === "WETH" ? "ethereum" : token.symbol === "WBNB" ? "binancecoin" : token.symbol === "WAVAX" ? "avalanche-2" : undefined;
    const quote = priceFor(token.symbol, nativeCoin, prices);
    const valueUsd = quote.priceUsd !== null ? balance * quote.priceUsd : 0;
    if (quote.priceUsd !== null && valueUsd < 0.01) return;
    holdings.push({
      symbol: token.symbol,
      name: token.name,
      address: token.address,
      decimals: token.decimals,
      chain: spec.id,
      iconUrl: null,
      fungibleId: token.address,
      balance,
      priceUsd: quote.priceUsd,
      change24h: quote.change24h,
      valueUsd,
    });
  });

  return holdings;
}

export async function loadPublicPortfolio(address: string): Promise<AutoPortfolio> {
  const prices = await fetchCoinPrices();
  const settled = await Promise.allSettled(
    CHAINS.map((spec) => readChain(spec, address as Address, prices)),
  );
  const tokens = settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  tokens.sort((a, b) => b.valueUsd - a.valueUsd);
  const walletUsd = tokens.reduce((sum, token) => sum + token.valueUsd, 0);
  const chains = [...new Set(tokens.map((token) => token.chain))];

  return {
    address: address.toLowerCase(),
    tokens,
    positions: [],
    walletUsd,
    defiUsd: 0,
    totalUsd: walletUsd,
    chains,
    provider: "public",
    coverage: "major-tokens",
    updatedAt: Date.now(),
  };
}

const cachedPublicPortfolio = unstable_cache(loadPublicPortfolio, ["public-portfolio-v1"], {
  revalidate: CACHE_SECONDS,
});

export class PublicRpcProvider implements PortfolioProvider {
  readonly name = "public";

  async getPortfolio(address: string): Promise<AutoPortfolio> {
    return cachedPublicPortfolio(address.toLowerCase());
  }
}
