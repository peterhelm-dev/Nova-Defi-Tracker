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
import { useMemo, useState } from "react";
import { usePreferences } from "@/hooks/usePreferences";
import { allocationFromGroups, applyScope, groupBalances, isDust, type DefiSlice, type TaggedHolding } from "@/lib/balanceView";
import { walletTitle } from "@/lib/experience";
import { formatChainName, shortenAddress } from "@/lib/format";
import { useIsClient } from "@/lib/useIsClient";
import { playUiSound } from "@/lib/sounds";
import type { WidgetId } from "@/lib/dashboardLayout";
import { AlertsCard } from "./AlertsCard";
import { ApprovalsCard } from "./ApprovalsCard";
import { DustCard } from "./DustCard";
import { AssetAllocationChart } from "./AssetAllocationChart";
import { BalanceBoard } from "./BalanceBoard";
import { ChainBreakdownCard, type ChainTotal } from "./ChainBreakdownCard";
import { DashboardGrid } from "./DashboardGrid";
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
import { TokenPnlCard } from "./TokenPnlCard";
import { TopMoversCard } from "./TopMoversCard";
import { WalletBook } from "./WalletBook";

function walletLabels(wallets: { address: string; nickname?: string; label: string }[]): Map<string, string> {
  const titled = wallets.map((wallet) => ({
    address: wallet.address.toLowerCase(),
    title: walletTitle(wallet) ?? shortenAddress(wallet.address),
  }));
  const counts = new Map<string, number>();
  for (const entry of titled) counts.set(entry.title, (counts.get(entry.title) ?? 0) + 1);
  return new Map(
    titled.map((entry) => [
      entry.address,
      (counts.get(entry.title) ?? 0) > 1 ? `${entry.title} · ${shortenAddress(entry.address)}` : entry.title,
    ]),
  );
}

export function Dashboard() {
  const isClient = useIsClient();
  const [editing, setEditing] = useState(false);
  const { address: rawConnected } = useAccount();
  const connected = isClient ? rawConnected : undefined;
  const { authedAddress } = useAuth();
  const { prefs, setPrefs } = usePreferences();
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

  const labels = useMemo(() => walletLabels(book.wallets), [book.wallets]);
  const tagged: TaggedHolding[] = useMemo(
    () =>
      auto.perWallet.flatMap((portfolio) => {
        const wallet = labels.get(portfolio.address.toLowerCase()) ?? shortenAddress(portfolio.address);
        return portfolio.tokens.map((token) => ({ ...token, wallet }));
      }),
    [auto.perWallet, labels],
  );
  const defiSlices: DefiSlice[] = useMemo(() => {
    const detected = auto.perWallet.flatMap((portfolio) =>
      portfolio.positions.map((position) => ({
        id: `${portfolio.address}:${position.id}`,
        label: position.protocol ? `${position.symbol} (${position.protocol})` : position.symbol,
        valueUsd: position.valueUsd,
        chain: position.chain,
      })),
    );
    if (detected.length > 0) return detected;
    if (manualDefiUsd > 0) {
      return [{ id: "manual-defi", label: "Tracked positions", valueUsd: manualDefiUsd, chain: "defi" }];
    }
    return [];
  }, [auto.perWallet, manualDefiUsd]);

  const viewHoldings = useMemo(() => {
    const scoped = applyScope(tagged, prefs.balanceView.scope);
    return prefs.balanceView.hideDust ? scoped.filter((holding) => !isDust(holding)) : scoped;
  }, [tagged, prefs.balanceView.scope, prefs.balanceView.hideDust]);

  const allocationSlices = useMemo(() => {
    const groups = groupBalances({
      holdings: applyScope(tagged, prefs.balanceView.scope),
      defi: defiSlices,
      groupBy: prefs.balanceView.groupBy,
      hideDust: prefs.balanceView.hideDust,
      sort: prefs.balanceView.sort,
    });
    return allocationFromGroups(groups).map((slice) => ({
      ...slice,
      name: prefs.balanceView.groupBy === "chain" ? formatChainName(slice.name) : slice.name,
    }));
  }, [tagged, defiSlices, prefs.balanceView]);

  function renderWidget(id: WidgetId) {
    switch (id) {
      case "net-worth":
        return (
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
        );
      case "performance":
        return history.length < 2 ? (
          <p className="rounded-2xl border border-border-subtle bg-surface px-4 py-8 text-sm text-text-muted">
            Performance shows up after the next snapshot.
          </p>
        ) : (
          <PerformanceCard history={history} />
        );
      case "history":
        return <NetWorthChart history={history} />;
      case "allocation":
        return <AssetAllocationChart slices={allocationSlices} />;
      case "chains":
        return <ChainBreakdownCard totals={chainTotals} />;
      case "movers":
        return <TopMoversCard holdings={viewHoldings} />;
      case "defi":
        return detectedPositions.length > 0 ? (
          <DetectedPositionsCard positions={detectedPositions} />
        ) : (
          <p className="rounded-2xl border border-border-subtle bg-surface px-4 py-8 text-sm text-text-muted">
            No Aave, Compound, or staking position showed up in this view. You can still track a pool by hand below.
          </p>
        );
      case "holdings":
        return (
          <BalanceBoard
            holdings={tagged}
            defi={defiSlices}
            view={prefs.balanceView}
            isLoading={isLoading}
            showAllocation={false}
            onChange={(balanceView) => setPrefs((prev) => ({ ...prev, balanceView }))}
          />
        );
      default:
        return null;
    }
  }

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

          <DashboardGrid
            layout={prefs.dashboardLayout}
            editing={editing}
            onEditingChange={setEditing}
            onChange={(dashboardLayout) => setPrefs((prev) => ({ ...prev, dashboardLayout }))}
            render={renderWidget}
          />
          <DustCard holdings={holdings} />
          <ApprovalsCard address={primary} holdings={holdings} />
          <DiversificationCard items={diversificationItems} totalUsd={walletUsd + defiUsd} />
          {pnl.configured || pnl.isLoading ? (
            <PnlCard pnl={pnl.pnl} isLoading={pnl.isLoading} />
          ) : null}
          {tokenPnl.configured || tokenPnl.isLoading ? (
            <TokenPnlCard holdings={holdings} tokenPnl={tokenPnl.tokenPnl} isLoading={tokenPnl.isLoading} />
          ) : null}
          <GasSpendCard
            gas={gasSpend.gas}
            isLoading={gasSpend.isLoading}
            configured={gasSpend.configured}
            isError={gasSpend.isError}
          />
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
