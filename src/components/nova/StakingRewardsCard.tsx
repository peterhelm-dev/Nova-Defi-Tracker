import { NoriCoachCard } from "./NoriCoachCard";

/**
 * Scaffold only: no staking-protocol integration is connected, and unlike
 * risk/position-detail the supplied sample dataset has no staking section to
 * fall back to. Per IMPLEMENTATION_RULES.md ("No fabricated wallet balances
 * in production mode"), this stays an honest empty state rather than
 * inventing numbers, until a real staking data source is wired up.
 */
export function StakingRewardsCard() {
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface p-6">
      <p className="text-sm font-medium text-text-secondary">Staking Rewards</p>
      <NoriCoachCard
        state="neutral"
        title="No staking integration yet"
        message="This section will show staked balances, estimated APY, and claimable rewards once a staking data source is connected."
        className="mt-4"
      />
    </div>
  );
}
