"use client";

import { useAuth } from "@/hooks/useAuth";
import { useWalletHoldings } from "@/hooks/useWalletHoldings";
import { useNetWorthHistory } from "@/hooks/useNetWorthHistory";
import { useTrackedPositions } from "@/hooks/useTrackedPositions";
import { AssetAllocationChart } from "./AssetAllocationChart";
import { DefiPoolsSection } from "./DefiPoolsSection";
import { EmptyWalletState } from "./EmptyWalletState";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { NetWorthChart } from "./NetWorthChart";
import { NetWorthSummary } from "./NetWorthSummary";
import { TokenHoldingsTable } from "./TokenHoldingsTable";

export function Dashboard() {
  const {
    address,
    holdings,
    totalUsd: walletUsd,
    isLoading,
    pricesUnavailable,
    pricesUpdatedAt,
  } = useWalletHoldings();
  const { authedAddress } = useAuth();
  const { positions, addPosition, removePosition, totalUsd: defiUsd } =
    useTrackedPositions(authedAddress);
  const history = useNetWorthHistory(
    walletUsd,
    defiUsd,
    !!address && !isLoading,
    authedAddress,
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
        {!address ? (
          <EmptyWalletState />
        ) : (
          <>
            <NetWorthSummary
              walletUsd={walletUsd}
              defiUsd={defiUsd}
              totalUsd={walletUsd + defiUsd}
              holdings={holdings}
              isLoading={isLoading}
              pricesUnavailable={pricesUnavailable}
              pricesUpdatedAt={pricesUpdatedAt}
            />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <NetWorthChart history={history} />
              </div>
              <AssetAllocationChart holdings={holdings} defiUsd={defiUsd} />
            </div>
            <TokenHoldingsTable holdings={holdings} isLoading={isLoading} />
          </>
        )}
        <DefiPoolsSection
          positions={positions}
          onAdd={addPosition}
          onRemove={removePosition}
        />
      </main>
      <Footer />
    </div>
  );
}
