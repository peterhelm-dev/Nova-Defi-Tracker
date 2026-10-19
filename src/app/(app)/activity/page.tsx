"use client";

import { useAccount } from "wagmi";
import { useActivity } from "@/hooks/useActivity";
import { RecentActivityCard } from "@/components/nova/RecentActivityCard";
import { NoriCoachCard } from "@/components/nova/NoriCoachCard";
import { useIsClient } from "@/lib/useIsClient";

export default function ActivityPage() {
  const isClient = useIsClient();
  const { address } = useAccount();
  const { activity, configured, isLoading } = useActivity(isClient ? address : undefined, 50);

  if (!isClient || !address) {
    return (
      <NoriCoachCard
        state="neutral"
        title="Connect a wallet"
        message="Connect a wallet to see its recent onchain activity."
        size="hero"
        layout="center"
        className="mx-auto max-w-md"
      />
    );
  }

  if (!isLoading && !configured) {
    return (
      <NoriCoachCard
        state="thinking"
        title="No activity indexer configured"
        message="Transaction history isn't part of the free token lookup. It stays off unless a Zerion key is added later."
        size="hero"
        layout="center"
        className="mx-auto max-w-md"
      />
    );
  }

  return <RecentActivityCard activity={activity} isLoading={isLoading} />;
}
