import { createPublicClient, http, type Chain, type PublicClient } from "viem";
import { arbitrum, avalanche, base, bsc, mainnet, optimism, polygon } from "viem/chains";
import { siteOrigin } from "@/lib/server/prices";

const CHAINS: Record<string, { chain: Chain; alchemy: string; rpc: string; nativeSymbol: string }> = {
  ethereum: { chain: mainnet, alchemy: "eth-mainnet", rpc: "https://ethereum-rpc.publicnode.com", nativeSymbol: "ETH" },
  base: { chain: base, alchemy: "base-mainnet", rpc: "https://base-rpc.publicnode.com", nativeSymbol: "ETH" },
  arbitrum: { chain: arbitrum, alchemy: "arb-mainnet", rpc: "https://arbitrum-one-rpc.publicnode.com", nativeSymbol: "ETH" },
  optimism: { chain: optimism, alchemy: "opt-mainnet", rpc: "https://optimism-rpc.publicnode.com", nativeSymbol: "ETH" },
  polygon: { chain: polygon, alchemy: "polygon-mainnet", rpc: "https://polygon-bor-rpc.publicnode.com", nativeSymbol: "POL" },
  avalanche: { chain: avalanche, alchemy: "avax-mainnet", rpc: "https://avalanche-c-chain-rpc.publicnode.com", nativeSymbol: "AVAX" },
  "binance-smart-chain": { chain: bsc, alchemy: "bnb-mainnet", rpc: "https://bsc-rpc.publicnode.com", nativeSymbol: "BNB" },
};

export function trackedChains(): string[] {
  return Object.keys(CHAINS);
}

export function nativeSymbol(chain: string): string {
  return CHAINS[chain]?.nativeSymbol ?? "ETH";
}

export function evmClient(chain: string): PublicClient {
  const spec = CHAINS[chain];
  if (!spec) throw new Error(`Unsupported chain ${chain}`);
  const key = process.env.ALCHEMY_API_KEY?.trim();
  const alchemy = Boolean(key);
  const url = alchemy ? `https://${spec.alchemy}.g.alchemy.com/v2/${key}` : spec.rpc;
  return createPublicClient({
    chain: spec.chain,
    transport: http(url, {
      timeout: 8_000,
      fetchOptions: alchemy ? { headers: { origin: siteOrigin() } } : undefined,
    }),
  });
}
