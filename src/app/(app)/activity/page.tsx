"use client";

import { useAccount } from "wagmi";
import { useActivity } from "@/hooks/useActivity";
import { useWalletBook } from "@/hooks/useWalletBook";
import { RecentActivityCard } from "@/components/nova/RecentActivityCard";
import { NoriCoachCard } from "@/components/nova/NoriCoachCard";
import { useIsClient } from "@/lib/useIsClient";

export default function ActivityPage() {
  const isClient = useIsClient();
  const { address: connected } = useAccount();
  const book = useWalletBook(isClient ? connected : undefined);
  const address = isClient ? (connected ?? book.wallets[0]?.address) : undefined;
  const { activity, configured, isLoading } = useActivity(address, 40);

  if (!isClient) return null;

  if (!address) {
    return (
      <NoriCoachCard
        state="neutral"
        title="Add a wallet"
        message="Connect a wallet, or paste an address on the portfolio page, to see its recent transfers. Novafolio only reads them."
        size="hero"
        layout="center"
        className="mx-auto max-w-md"
      />
    );
  }

  if (!isLoading && !configured) {
    return (
      <NoriCoachCard
        state="neutral"
        title="Transfers stay off on this copy"
        message="Recent transfers use the same Alchemy key as token balances. This deployment doesn't have that key, so history isn't shown. Balances on the portfolio page still load from public data."
        size="hero"
        layout="center"
        className="mx-auto max-w-md"
      />
    );
  }

  return <RecentActivityCard activity={activity} isLoading={isLoading} />;
}
