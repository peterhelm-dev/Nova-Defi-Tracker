import { getAddress, isAddress } from "viem";
import { chainIconUrl, normalizeChainId } from "./chainIcons";

const TRUST_FOLDER: Record<string, string> = {
  ethereum: "ethereum",
  base: "base",
  arbitrum: "arbitrum",
  optimism: "optimism",
  polygon: "polygon",
  "binance-smart-chain": "smartchain",
  avalanche: "avalanchec",
};

const NATIVE_ADDRESSES = new Set([
  "native",
  "eth",
  "0x0000000000000000000000000000000000000000",
  "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
]);

const MONOGRAM_HUES = [16, 24, 32, 150, 174, 200, 8, 42];

export function isNativeToken(address?: string | null): boolean {
  if (!address) return false;
  return NATIVE_ADDRESSES.has(address.trim().toLowerCase());
}

/** Trust Wallet's public asset repo, via jsDelivr so browsers can load it. */
export function trustWalletTokenIcon(chain: string, address: string): string | null {
  const folder = TRUST_FOLDER[normalizeChainId(chain)];
  if (!folder || !address) return null;
  if (isNativeToken(address)) {
    return `https://cdn.jsdelivr.net/gh/trustwallet/assets@master/blockchains/${folder}/info/logo.png`;
  }
  if (!isAddress(address)) return null;
  const checksum = getAddress(address);
  return `https://cdn.jsdelivr.net/gh/trustwallet/assets@master/blockchains/${folder}/assets/${checksum}/logo.png`;
}

function githubMirror(jsDelivrUrl: string): string {
  return jsDelivrUrl.replace(
    "https://cdn.jsdelivr.net/gh/trustwallet/assets@master/",
    "https://raw.githubusercontent.com/trustwallet/assets/master/",
  );
}

/**
 * Ordered logo URLs for a token. Callers try each one, then a monogram.
 * Provided metadata (Alchemy, Zerion) wins; Trust Wallet covers the long tail.
 */
export function tokenIconSources(input: {
  iconUrl?: string | null;
  chain: string;
  address?: string | null;
}): string[] {
  const sources: string[] = [];
  const push = (url?: string | null) => {
    if (url && !sources.includes(url)) sources.push(url);
  };

  push(input.iconUrl);
  if (!input.address) return sources;

  if (isNativeToken(input.address)) {
    push(chainIconUrl(input.chain));
  }

  const trust = trustWalletTokenIcon(input.chain, input.address);
  push(trust);
  if (trust) push(githubMirror(trust));
  return sources;
}

export function monogramLabel(text: string): string {
  const letters = text.replace(/[^a-zA-Z0-9]/g, "");
  if (!letters) return "?";
  if (letters.length === 1) return letters.toUpperCase();
  return letters.slice(0, 2).toUpperCase();
}

/** Stable, muted color so unknown tokens aren't identical gray bubbles. */
export function monogramStyle(seed: string): { background: string; color: string } {
  const text = seed.trim().toLowerCase() || "?";
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 33 + text.charCodeAt(i)) >>> 0;
  }
  const hue = MONOGRAM_HUES[hash % MONOGRAM_HUES.length];
  return {
    background: `hsl(${hue} 36% 32%)`,
    color: `hsl(${hue} 42% 94%)`,
  };
}
