"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useActivity } from "@/hooks/useActivity";
import { useAutoPortfolio } from "@/hooks/useAutoPortfolio";
import { useGasSpend } from "@/hooks/useGasSpend";
import { useWalletHoldings } from "@/hooks/useWalletHoldings";
import { useNetWorthHistory } from "@/hooks/useNetWorthHistory";
import { useTrackedPositions } from "@/hooks/useTrackedPositions";
import { useTokenPnl } from "@/hooks/useTokenPnl";
import { useWalletPnl } from "@/hooks/useWalletPnl";
import { AlertsCard } from "./AlertsCard";
import { AssetAllocationChart } from "./AssetAllocationChart";
import { AutoDetectionBanner } from "./AutoDetectionBanner";
import { ChainBreakdownCard, type ChainTotal } from "./ChainBreakdownCard";
import { DefiPoolsSection } from "./DefiPoolsSection";
import { DetectedPositionsCard } from "./DetectedPositionsCard";
import { DiversificationCard, type DiversificationItem } from "./DiversificationCard";
import { EmptyWalletState } from "./EmptyWalletState";
import { GasSpendCard } from "./GasSpendCard";
import { NetWorthChart } from "./NetWorthChart";
import { NetWorthSummary } from "./NetWorthSummary";
import { NoriCoachCard } from "./nova/NoriCoachCard";
import { RecentActivityCard } from "./nova/RecentActivityCard";
import { RiskOverviewCard } from "./nova/RiskOverviewCard";
import { StakingRewardsCard } from "./nova/StakingRewardsCard";
import { PerformanceCard } from "./PerformanceCard";
import { PnlCard } from "./PnlCard";
import { TokenHoldingsTable } from "./TokenHoldingsTable";
import { TokenPnlCard } from "./TokenPnlCard";
import { TopMoversCard } from "./TopMoversCard";

export function Dashboard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const {
    address: rawAddress,
    holdings: walletHoldings,
    totalUsd: walletHoldingsUsd,
    isLoading: walletLoading,
    pricesUnavailable,
    pricesUpdatedAt,
  } = useWalletHoldings();
  const { authedAddress } = useAuth();
  const auto = useAutoPortfolio(mounted ? rawAddress : undefined);
  const pnl = useWalletPnl(mounted ? rawAddress : undefined);
  const gasSpend = useGasSpend(mounted ? rawAddress : undefined);
  const activity = useActivity(mounted ? rawAddress : undefined, 5);
  const {
    positions,
    addPosition,
    removePosition,
    totalUsd: manualDefiUsd,
  } = useTrackedPositions(authedAddress);

  // Defer wallet-dependent state until after hydration so server and client
  // agree on the initial render (wagmi restores address from storage only on
  // the client, which would otherwise cause a tree mismatch).
  const address = mounted ? rawAddress : undefined;

  // Multi-chain auto-detection is the primary flow for any connected wallet;
  // fall back to the curated Base-only flow only if it's unavailable.
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

  const detectedPositions = usingAuto ? auto.portfolio!.positions : [];

  const topFungibleIds = [...holdings]
    .filter((h) => h.fungibleId)
    .sort((a, b) => b.valueUsd - a.valueUsd)
    .slice(0, 10)
    .map((h) => h.fungibleId!);
  const tokenPnl = useTokenPnl(
    usingAuto && mounted ? rawAddress : undefined,
    topFungibleIds,
  );

  const chainTotals: ChainTotal[] = (() => {
    const byChain = new Map<string, number>();
    for (const holding of holdings) {
      byChain.set(holding.chain, (byChain.get(holding.chain) ?? 0) + holding.valueUsd);
    }
    if (usingAuto) {
      for (const position of detectedPositions) {
        byChain.set(position.chain, (byChain.get(position.chain) ?? 0) + position.valueUsd);
      }
    } else if (manualDefiUsd > 0) {
      byChain.set("base", (byChain.get("base") ?? 0) + manualDefiUsd);
    }
    return [...byChain.entries()].map(([chain, valueUsd]) => ({ chain, valueUsd }));
  })();

  const diversificationItems: DiversificationItem[] = [
    ...holdings.map((h) => ({ label: h.symbol, valueUsd: h.valueUsd })),
    ...detectedPositions.map((p) => ({
      label: p.protocol ? `${p.symbol} (${p.protocol})` : p.symbol,
      valueUsd: p.valueUsd,
    })),
  ];

  if (!address) return <EmptyWalletState />;

  // "Empty wallet" — connected, but nothing found (distinct from
  // "disconnected" above), per DESIGN_SPEC.md required states.
  const isEmptyWallet =
    !isLoading &&
    !auto.isLoading &&
    holdings.length === 0 &&
    detectedPositions.length === 0 &&
    defiUsd === 0;

  if (isEmptyWallet) {
    return (
      <NoriCoachCard
        state="neutral"
        title="Nothing here yet"
        message="Connect another address or explore what NOVA can track."
        size="hero"
        layout="center"
        className="mx-auto max-w-md"
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <AutoDetectionBanner
        configured={auto.configured}
        entitled={auto.entitled}
        isLoading={auto.isLoading}
        portfolio={auto.portfolio}
      />

      {/* Portfolio hero */}
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

      {/* Main grid: allocation detail, DeFi positions, staking */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {usingAuto ? (
          <DetectedPositionsCard positions={detectedPositions} />
        ) : (
          <DefiPoolsSection positions={positions} onAdd={addPosition} onRemove={removePosition} />
        )}
        <StakingRewardsCard />
      </div>

      {/* Secondary grid: risk overview and recent activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RiskOverviewCard />
        <RecentActivityCard activity={activity.activity} isLoading={activity.isLoading} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChainBreakdownCard totals={chainTotals} />
        <DiversificationCard items={diversificationItems} totalUsd={walletUsd + defiUsd} />
      </div>
      {usingAuto && (pnl.configured || pnl.isLoading) ? (
        <PnlCard pnl={pnl.pnl} isLoading={pnl.isLoading} />
      ) : null}
      {usingAuto && (tokenPnl.configured || tokenPnl.isLoading) ? (
        <TokenPnlCard
          holdings={holdings}
          tokenPnl={tokenPnl.tokenPnl}
          isLoading={tokenPnl.isLoading}
        />
      ) : null}
      <TopMoversCard holdings={holdings} />
      {usingAuto && (gasSpend.configured || gasSpend.isLoading) ? (
        <GasSpendCard gas={gasSpend.gas} isLoading={gasSpend.isLoading} />
      ) : null}
      <TokenHoldingsTable holdings={holdings} isLoading={isLoading} />
      <AlertsCard authedAddress={authedAddress} />
    </div>
  );
}
