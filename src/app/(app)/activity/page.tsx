"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useActivity } from "@/hooks/useActivity";
import { RecentActivityCard } from "@/components/nova/RecentActivityCard";
import { NoriCoachCard } from "@/components/nova/NoriCoachCard";

export default function ActivityPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { address } = useAccount();
  const { activity, configured, isLoading } = useActivity(mounted ? address : undefined, 50);

  if (!mounted || !address) {
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
        message="Recent activity needs a multi-chain indexer — none is set up in this environment."
        size="hero"
        layout="center"
        className="mx-auto max-w-md"
      />
    );
  }

  return <RecentActivityCard activity={activity} isLoading={isLoading} />;
}
