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
import { MAJOR_TOKENS } from "@/lib/majorTokens";
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
    tokens: MAJOR_TOKENS.ethereum,
  },
  {
    id: "base",
    chain: base,
    rpc: "https://base.publicnode.com",
    native: { symbol: "ETH", name: "Ethereum", coinId: "ethereum" },
    tokens: MAJOR_TOKENS.base,
  },
  {
    id: "arbitrum",
    chain: arbitrum,
    rpc: "https://arbitrum-one.publicnode.com",
    native: { symbol: "ETH", name: "Ethereum", coinId: "ethereum" },
    tokens: MAJOR_TOKENS.arbitrum,
  },
  {
    id: "optimism",
    chain: optimism,
    rpc: "https://optimism.publicnode.com",
    native: { symbol: "ETH", name: "Ethereum", coinId: "ethereum" },
    tokens: MAJOR_TOKENS.optimism,
  },
  {
    id: "polygon",
    chain: polygon,
    rpc: "https://polygon-bor.publicnode.com",
    native: { symbol: "POL", name: "Polygon", coinId: "matic-network" },
    tokens: MAJOR_TOKENS.polygon,
  },
  {
    id: "binance-smart-chain",
    chain: bsc,
    rpc: "https://bsc.publicnode.com",
    native: { symbol: "BNB", name: "BNB", coinId: "binancecoin" },
    tokens: MAJOR_TOKENS["binance-smart-chain"],
  },
  {
    id: "avalanche",
    chain: avalanche,
    rpc: "https://avalanche-c-chain.publicnode.com",
    native: { symbol: "AVAX", name: "Avalanche", coinId: "avalanche-2" },
    tokens: MAJOR_TOKENS.avalanche,
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
  const key = process.env.COINGECKO_API_KEY?.trim() ?? "";
  const isPro = process.env.COINGECKO_PLAN === "pro";
  const host = isPro ? "https://pro-api.coingecko.com" : "https://api.coingecko.com";
  const headers: HeadersInit = key
    ? isPro
      ? { "x-cg-pro-api-key": key }
      : { "x-cg-demo-api-key": key }
    : {};
  const url =
    `${host}/api/v3/simple/price?ids=${COIN_IDS.join(",")}` +
    "&vs_currencies=usd&include_24hr_change=true";

  const res = await fetch(url, { headers, cache: "no-store" });
  if (!res.ok) return {};
  return (await res.json()) as Record<string, CoinPrice>;
}

function priceFor(symbol: string, coinId: string | undefined, prices: Record<string, CoinPrice>) {
  if (symbol === "USDC" || symbol === "USDT" || symbol === "DAI" || symbol === "USDT0" || symbol === "USD₮0") {
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
