"use client";

import { useAuth } from "@/hooks/useAuth";
import { useAutoPortfolio } from "@/hooks/useAutoPortfolio";
import { useWalletHoldings } from "@/hooks/useWalletHoldings";
import { useNetWorthHistory } from "@/hooks/useNetWorthHistory";
import { useTrackedPositions } from "@/hooks/useTrackedPositions";
import { AssetAllocationChart } from "./AssetAllocationChart";
import { AutoDetectionBanner } from "./AutoDetectionBanner";
import { DefiPoolsSection } from "./DefiPoolsSection";
import { DetectedPositionsCard } from "./DetectedPositionsCard";
import { EmptyWalletState } from "./EmptyWalletState";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { NetWorthChart } from "./NetWorthChart";
import { NetWorthSummary } from "./NetWorthSummary";
import { PerformanceCard } from "./PerformanceCard";
import { TokenHoldingsTable } from "./TokenHoldingsTable";

export function Dashboard() {
  const {
    address,
    holdings: walletHoldings,
    totalUsd: walletHoldingsUsd,
    isLoading: walletLoading,
    pricesUnavailable,
    pricesUpdatedAt,
  } = useWalletHoldings();
  const { authedAddress } = useAuth();
  const auto = useAutoPortfolio(!!authedAddress);
  const {
    positions,
    addPosition,
    removePosition,
    totalUsd: manualDefiUsd,
  } = useTrackedPositions(authedAddress);

  // When Pro auto-detection is available, it supersedes the curated Base-only
  // flow (complete + multi-chain); otherwise fall back to the free flow.
  const usingAuto = auto.portfolio !== null;
  const holdings = usingAuto ? auto.portfolio!.tokens : walletHoldings;
  const walletUsd = usingAuto ? auto.portfolio!.walletUsd : walletHoldingsUsd;
  const defiUsd = usingAuto ? auto.portfolio!.defiUsd : manualDefiUsd;
  const isLoading = usingAuto ? false : walletLoading;

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
            <AutoDetectionBanner
              isAuthed={authedAddress !== null}
              configured={auto.configured}
              entitled={auto.entitled}
              isLoading={auto.isLoading}
              portfolio={auto.portfolio}
            />
            <NetWorthSummary
              walletUsd={walletUsd}
              defiUsd={defiUsd}
              totalUsd={walletUsd + defiUsd}
              holdings={holdings}
              isLoading={isLoading}
              pricesUnavailable={pricesUnavailable}
              pricesUpdatedAt={pricesUpdatedAt}
            />
            <PerformanceCard history={history} />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <NetWorthChart history={history} />
              </div>
              <AssetAllocationChart holdings={holdings} defiUsd={defiUsd} />
            </div>
            <TokenHoldingsTable holdings={holdings} isLoading={isLoading} />
            {usingAuto ? (
              <DetectedPositionsCard positions={auto.portfolio!.positions} />
            ) : null}
          </>
        )}
        {/* Manual tracking is the free-tier path; auto-detection supersedes it. */}
        {!usingAuto ? (
          <DefiPoolsSection
            positions={positions}
            onAdd={addPosition}
            onRemove={removePosition}
          />
        ) : null}
      </main>
      <Footer />
    </div>
  );
}
