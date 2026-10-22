"use client";

import { DefiPoolsSection } from "@/components/DefiPoolsSection";
import { useAuth } from "@/hooks/useAuth";
import { useTrackedPositions } from "@/hooks/useTrackedPositions";

export default function ExplorePage() {
  const { authedAddress } = useAuth();
  const { positions, addPosition, removePosition } = useTrackedPositions(authedAddress);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-secondary">
        Pool TVL and APY on the major chains, when the yields source is available.
        Aave, Compound, and staking detected on the dashboard stay read-only.
        Tracking any other pool is manual. Novafolio does not move funds, and these
        numbers are not financial advice.
      </p>
      <DefiPoolsSection positions={positions} onAdd={addPosition} onRemove={removePosition} />
    </div>
  );
}
