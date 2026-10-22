"use client";

import { useAccount } from "wagmi";
import { useAuth } from "@/hooks/useAuth";
import { useActivity } from "@/hooks/useActivity";
import { useAutoPortfolio } from "@/hooks/useAutoPortfolio";
import { useGasSpend } from "@/hooks/useGasSpend";
import { useNetWorthHistory } from "@/hooks/useNetWorthHistory";
import { useTrackedPositions } from "@/hooks/useTrackedPositions";
import { useTokenPnl } from "@/hooks/useTokenPnl";
import { useWalletBook } from "@/hooks/useWalletBook";
import { useWalletPnl } from "@/hooks/useWalletPnl";
import { useIsClient } from "@/lib/useIsClient";
import { AlertsCard } from "./AlertsCard";
import { AssetAllocationChart } from "./AssetAllocationChart";
import { ChainBreakdownCard, type ChainTotal } from "./ChainBreakdownCard";
import { DefiPoolsSection } from "./DefiPoolsSection";
import { DetectedPositionsCard } from "./DetectedPositionsCard";
import { DiversificationCard, type DiversificationItem } from "./DiversificationCard";
import { EmptyWalletState } from "./EmptyWalletState";
import { GasSpendCard } from "./GasSpendCard";
import { NetWorthChart } from "./NetWorthChart";
import { NetWorthSummary } from "./NetWorthSummary";
import { RecentActivityCard } from "./nova/RecentActivityCard";
import { PerformanceCard } from "./PerformanceCard";
import { PnlCard } from "./PnlCard";
import { TokenHoldingsTable } from "./TokenHoldingsTable";
import { TokenPnlCard } from "./TokenPnlCard";
import { TopMoversCard } from "./TopMoversCard";
import { WalletBook } from "./WalletBook";
import { playUiSound } from "@/lib/sounds";

export function Dashboard() {
  const isClient = useIsClient();
  const { address: rawConnected } = useAccount();
  const connected = isClient ? rawConnected : undefined;
  const { authedAddress } = useAuth();
  const book = useWalletBook(connected);
  const addresses = isClient ? book.wallets.map((wallet) => wallet.address) : [];

  const auto = useAutoPortfolio(addresses);
  const primary = connected ?? addresses[0];
  const pnl = useWalletPnl(primary);
  const gasSpend = useGasSpend(primary);
  const activity = useActivity(primary, 5);
  const { positions, addPosition, removePosition, totalUsd: manualDefiUsd } = useTrackedPositions(
    authedAddress,
  );

  const portfolio = auto.portfolio;
  const holdings = portfolio?.tokens ?? [];
  const detectedPositions = portfolio?.positions ?? [];
  const walletUsd = portfolio?.walletUsd ?? 0;
  const defiUsd =
    detectedPositions.length > 0 ? (portfolio?.defiUsd ?? 0) : (portfolio?.defiUsd ?? 0) + manualDefiUsd;
  const isLoading = auto.isLoading;

  const history = useNetWorthHistory(walletUsd, defiUsd, addresses.length > 0 && !isLoading, authedAddress);

  const topFungibleIds = [...holdings]
    .filter((holding) => holding.fungibleId)
    .sort((a, b) => b.valueUsd - a.valueUsd)
    .slice(0, 10)
    .map((holding) => holding.fungibleId!);
  const tokenPnl = useTokenPnl(primary, topFungibleIds);

  const chainTotals: ChainTotal[] = (() => {
    const byChain = new Map<string, number>();
    for (const holding of holdings) {
      byChain.set(holding.chain, (byChain.get(holding.chain) ?? 0) + holding.valueUsd);
    }
    for (const position of detectedPositions) {
      byChain.set(position.chain, (byChain.get(position.chain) ?? 0) + position.valueUsd);
    }
    if (detectedPositions.length === 0 && manualDefiUsd > 0) {
      byChain.set("defi", (byChain.get("defi") ?? 0) + manualDefiUsd);
    }
    return [...byChain.entries()].map(([chain, valueUsd]) => ({ chain, valueUsd }));
  })();

  const diversificationItems: DiversificationItem[] = [
    ...holdings.map((holding) => ({ label: holding.symbol, valueUsd: holding.valueUsd })),
    ...detectedPositions.map((position) => ({
      label: position.protocol ? `${position.symbol} (${position.protocol})` : position.symbol,
      valueUsd: position.valueUsd,
    })),
  ];

  const showActivity = activity.configured || activity.isLoading;

  return (
    <div className="flex flex-col gap-6">
      {addresses.length === 0 ? (
        <EmptyWalletState onAdd={book.addWatch} />
      ) : (
        <>
          <WalletBook
            connectedAddress={connected}
            wallets={book.wallets}
            saved={book.saved}
            onAdd={book.addWatch}
            onRemove={book.removeWallet}
            onKeep={book.keepConnected}
            onUpdateIdentity={book.updateIdentity}
          />
          {portfolio?.coverage === "major-tokens" ? (
            <p className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-2.5 text-sm text-foreground">
              Showing major tokens from public data. An Alchemy API key detects
              every token automatically — without it, long-tail balances stay hidden.
            </p>
          ) : null}
          {auto.degraded && portfolio?.coverage !== "major-tokens" ? (
            <p className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-2.5 text-sm text-foreground">
              The token indexer didn&apos;t respond, so this view fell back to major tokens.
            </p>
          ) : null}
          {auto.isError ? (
            <p className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-2.5 text-sm text-foreground">
              Portfolio data is temporarily unavailable. Tracked positions below are still saved in this browser.
            </p>
          ) : null}

          <NetWorthSummary
            walletUsd={walletUsd}
            defiUsd={defiUsd}
            totalUsd={walletUsd + defiUsd}
            holdings={holdings}
            isLoading={isLoading}
            pricesUnavailable={auto.isError}
            pricesUpdatedAt={portfolio?.updatedAt}
            onRefresh={async () => {
              await auto.refetch();
              playUiSound("refresh");
            }}
          />
          <PerformanceCard history={history} />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <NetWorthChart history={history} />
            </div>
            <AssetAllocationChart holdings={holdings} defiUsd={defiUsd} />
          </div>

          {detectedPositions.length > 0 ? (
            <DetectedPositionsCard positions={detectedPositions} />
          ) : null}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ChainBreakdownCard totals={chainTotals} />
            <DiversificationCard items={diversificationItems} totalUsd={walletUsd + defiUsd} />
          </div>
          {pnl.configured || pnl.isLoading ? (
            <PnlCard pnl={pnl.pnl} isLoading={pnl.isLoading} />
          ) : null}
          {tokenPnl.configured || tokenPnl.isLoading ? (
            <TokenPnlCard holdings={holdings} tokenPnl={tokenPnl.tokenPnl} isLoading={tokenPnl.isLoading} />
          ) : null}
          <TopMoversCard holdings={holdings} />
          {gasSpend.configured || gasSpend.isLoading ? (
            <GasSpendCard gas={gasSpend.gas} isLoading={gasSpend.isLoading} />
          ) : null}
          <TokenHoldingsTable holdings={holdings} isLoading={isLoading} />
          {showActivity ? (
            <RecentActivityCard activity={activity.activity} isLoading={activity.isLoading} />
          ) : null}
          <AlertsCard authedAddress={authedAddress} />
        </>
      )}

      <DefiPoolsSection positions={positions} onAdd={addPosition} onRemove={removePosition} />
    </div>
  );
}
