import { mapPoolPoints, type PoolPoint } from "@/lib/research";
import { mapLlamaPools } from "@/lib/yields";
import type { DefiPool } from "@/types";
import type { YieldsProvider } from "./provider";

/**
 * DeFiLlama yields.
 *
 * Checked 2026-10-22 against https://api-docs.defillama.com/llms-free.txt:
 * the docs list `GET /pools` and `GET /chart/{pool}` as free on `api.llama.fi`.
 * Those two paths currently return 404. The live free data is still
 * `yields.llama.fi/pools` and `yields.llama.fi/chart/{pool}`. A third-party
 * client (dllma) says that legacy host shuts down on 2026-11-13; DefiLlama's
 * own docs do not state that date. This class tries the live host first, then
 * the documented free paths, so a host move does not require a new route.
 *
 * With `DEFILLAMA_API_KEY`, calls go to the paid Pro paths
 * `pro-api.llama.fi/{key}/yields/pools` and `/yields/chart/{pool}` ($300/mo).
 * Protocol TVL (`api.llama.fi/protocols`, `/tvl/{protocol}`) is a different,
 * still-free API and is not used here — it has no pool APY split.
 */
export class LlamaYieldsProvider implements YieldsProvider {
  readonly name: string;

  constructor(private readonly apiKey: string | null) {
    this.name = apiKey ? "defillama-pro" : "defillama-free";
  }

  async listPools(): Promise<DefiPool[]> {
    const pools = mapLlamaPools(await fetchFirst(this.poolUrls()));
    if (pools.length === 0) throw new Error("yields empty");
    return pools;
  }

  async getChart(poolId: string): Promise<PoolPoint[]> {
    return mapPoolPoints(await fetchFirst(this.chartUrls(poolId)));
  }

  private poolUrls(): string[] {
    if (this.apiKey) return [`https://pro-api.llama.fi/${encodeURIComponent(this.apiKey)}/yields/pools`];
    return ["https://yields.llama.fi/pools", "https://api.llama.fi/pools"];
  }

  private chartUrls(poolId: string): string[] {
    const id = encodeURIComponent(poolId);
    if (this.apiKey) return [`https://pro-api.llama.fi/${encodeURIComponent(this.apiKey)}/yields/chart/${id}`];
    return [`https://yields.llama.fi/chart/${id}`, `https://api.llama.fi/chart/${id}`];
  }
}

async function fetchFirst(urls: string[]): Promise<unknown> {
  let lastError: Error | null = null;
  for (const url of urls) {
    try {
      const res = await fetch(url, { next: { revalidate: 600 } });
      if (!res.ok) {
        lastError = new Error(`yields ${res.status}`);
        continue;
      }
      return await res.json();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("yields unavailable");
    }
  }
  throw lastError ?? new Error("yields unavailable");
}
