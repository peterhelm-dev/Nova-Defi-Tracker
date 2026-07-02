import type { AutoPortfolio, DetectedPosition, TokenHolding } from "@/types";
import type { PortfolioProvider } from "./provider";

/**
 * Zerion adapter. Zerion's Wallet Positions API returns fungible token balances
 * and DeFi positions (deposits, staked, rewards, loans) across every supported
 * chain, each already priced in USD — exactly the auto-detection the free
 * Base-only flow can't provide.
 *
 * Auth is HTTP Basic with the API key as the username and an empty password.
 *
 * NOTE: the response mapping (`mapZerionPositions`) is a pure function so it can
 * be unit-tested against fixtures. It targets Zerion's documented v1 schema;
 * verify against a live key when wiring a real ZERION_API_KEY.
 */

const ZERION_BASE = "https://api.zerion.io/v1";

// Minimal shape of the fields we read from a Zerion position resource.
type ZerionPosition = {
  id?: string;
  attributes?: {
    name?: string;
    value?: number | null;
    price?: number | null;
    quantity?: { float?: number | null } | null;
    position_type?: string;
    fungible_info?: {
      name?: string;
      symbol?: string;
      implementations?: { address?: string | null; decimals?: number | null }[];
    } | null;
    changes?: { percent_1d?: number | null } | null;
    flags?: { displayable?: boolean } | null;
  };
  relationships?: {
    chain?: { data?: { id?: string } };
    dapp?: { data?: { id?: string } } | null;
  };
};

export type ZerionPositionsResponse = { data?: ZerionPosition[] };

/** Pure transform from a Zerion positions payload to our AutoPortfolio. */
export function mapZerionPositions(
  address: string,
  payload: ZerionPositionsResponse,
): AutoPortfolio {
  const tokens: TokenHolding[] = [];
  const positions: DetectedPosition[] = [];
  const chains = new Set<string>();
  let walletUsd = 0;
  let defiUsd = 0;

  for (const [index, item] of (payload.data ?? []).entries()) {
    const attr = item.attributes ?? {};
    if (attr.flags?.displayable === false) continue;

    const value = typeof attr.value === "number" ? attr.value : 0;
    if (value <= 0) continue;

    const chain = item.relationships?.chain?.data?.id ?? "unknown";
    chains.add(chain);
    const info = attr.fungible_info ?? {};
    const symbol = info.symbol ?? "?";
    const name = info.name ?? symbol;
    const kind = attr.position_type ?? "wallet";

    if (kind === "wallet") {
      const impl = info.implementations?.[0];
      tokens.push({
        symbol,
        name,
        address: impl?.address ?? "native",
        decimals: impl?.decimals ?? 18,
        balance: attr.quantity?.float ?? 0,
        priceUsd: typeof attr.price === "number" ? attr.price : null,
        change24h:
          typeof attr.changes?.percent_1d === "number"
            ? attr.changes.percent_1d
            : null,
        valueUsd: value,
      });
      walletUsd += value;
    } else {
      positions.push({
        id: item.id ?? `${chain}-${symbol}-${index}`,
        chain,
        protocol: item.relationships?.dapp?.data?.id ?? null,
        kind,
        symbol,
        name,
        valueUsd: value,
      });
      defiUsd += value;
    }
  }

  tokens.sort((a, b) => b.valueUsd - a.valueUsd);
  positions.sort((a, b) => b.valueUsd - a.valueUsd);

  return {
    address: address.toLowerCase(),
    tokens,
    positions,
    walletUsd,
    defiUsd,
    totalUsd: walletUsd + defiUsd,
    chains: [...chains],
    provider: "zerion",
    updatedAt: Date.now(),
  };
}

export class ZerionProvider implements PortfolioProvider {
  readonly name = "zerion";

  constructor(private readonly apiKey: string) {}

  async getPortfolio(address: string): Promise<AutoPortfolio> {
    const auth = Buffer.from(`${this.apiKey}:`).toString("base64");
    const url =
      `${ZERION_BASE}/wallets/${address}/positions/` +
      `?currency=usd&filter[trash]=only_non_trash&sort=value`;

    const res = await fetch(url, {
      headers: { authorization: `Basic ${auth}`, accept: "application/json" },
      // Positions change slowly relative to prices; cache briefly.
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      throw new Error(`Zerion request failed: ${res.status}`);
    }

    const payload = (await res.json()) as ZerionPositionsResponse;
    return mapZerionPositions(address, payload);
  }
}
