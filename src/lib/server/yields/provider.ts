import type { PoolPoint } from "@/lib/research";
import type { DefiPool } from "@/types";

/**
 * Seam for pool TVL and APY. Routes and the research desk talk to this, not to
 * a host. Swap the implementation in `getYieldsProvider` when the free yields
 * host changes or a paid key is configured.
 */
export interface YieldsProvider {
  readonly name: string;
  /** Current pools. Throws when the source is unreachable or the payload is unusable. */
  listPools(): Promise<DefiPool[]>;
  /** APY and TVL history for one pool id. Throws when that history cannot be loaded. */
  getChart(poolId: string): Promise<PoolPoint[]>;
}
