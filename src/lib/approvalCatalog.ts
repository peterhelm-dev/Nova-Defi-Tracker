import { AAVE_MARKETS, COMPOUND_MARKETS, STAKING_TOKENS } from "@/lib/defi/markets";
import { MAJOR_TOKENS } from "@/lib/majorTokens";

/**
 * Current allowances are a contract read, not a log scan. These are the
 * token/spender pairs Novafolio asks about directly. Permit2 and the routers
 * are the same addresses the address guide lists; Base uses its own Uniswap
 * SwapRouter02.
 */
const PERMIT2 = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
const ONEINCH = "0x111111125421cA6dc452d289314280a0f8842A65";
const UNI_ROUTER = "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45";
const UNI_UNIVERSAL = "0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD";
const UNI_BASE = "0x2626664c2603336E57B271c5C0b26F421741e481";

/** How far back a non-archive RPC will still answer eth_getLogs. */
export const RECENT_APPROVAL_BLOCKS = 8_000n;

export type CatalogToken = { address: string; symbol: string; decimals: number };
export type CatalogSpender = { address: string; label: string };

export function approvalTokens(chain: string): CatalogToken[] {
  const byAddress = new Map<string, CatalogToken>();
  function add(address: string, symbol: string, decimals: number) {
    const key = address.toLowerCase();
    if (!byAddress.has(key)) byAddress.set(key, { address, symbol, decimals });
  }
  for (const token of MAJOR_TOKENS[chain] ?? []) add(token.address, token.symbol, token.decimals);
  for (const token of STAKING_TOKENS) {
    if (token.chain === chain) add(token.address, token.symbol, token.decimals);
  }
  for (const market of COMPOUND_MARKETS) {
    if (market.chain === chain) add(market.underlying, market.symbol, market.decimals);
  }
  for (const reserve of AAVE_MARKETS[chain]?.reserves ?? []) {
    add(reserve.underlying, reserve.symbol, reserve.decimals);
  }
  return [...byAddress.values()];
}

export function approvalSpenders(chain: string): CatalogSpender[] {
  const spenders: CatalogSpender[] = [
    { address: PERMIT2, label: "Permit2" },
    { address: ONEINCH, label: "1inch" },
  ];
  if (chain === "base") spenders.push({ address: UNI_BASE, label: "Uniswap" });
  else spenders.push({ address: UNI_ROUTER, label: "Uniswap" }, { address: UNI_UNIVERSAL, label: "Uniswap" });
  const pool = AAVE_MARKETS[chain]?.pool;
  if (pool) spenders.push({ address: pool, label: "Aave" });
  for (const market of COMPOUND_MARKETS) {
    if (market.chain === chain) spenders.push({ address: market.comet, label: `Compound ${market.symbol}` });
  }
  const seen = new Set<string>();
  return spenders.filter((spender) => {
    const key = spender.address.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function spenderLabel(chain: string, spender: string): string | null {
  const match = approvalSpenders(chain).find((item) => item.address.toLowerCase() === spender.toLowerCase());
  return match?.label ?? null;
}
