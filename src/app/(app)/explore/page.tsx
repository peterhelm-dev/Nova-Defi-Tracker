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
        Live pool TVL and APY on the major chains, from public DeFiLlama data.
        Tracking a position is manual. Novafolio does not move funds, and these
        numbers are not financial advice.
      </p>
      <DefiPoolsSection positions={positions} onAdd={addPosition} onRemove={removePosition} />
    </div>
  );
}
