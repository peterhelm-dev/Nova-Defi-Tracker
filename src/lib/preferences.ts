import {
  applyPreset,
  normalizeLayout,
  type DashboardLayout,
  type LayoutPreset,
} from "./dashboardLayout";
import {
  normalizeBalanceView,
  normalizeCurrency,
  type BalanceViewOptions,
  type DisplayCurrency,
} from "./balanceView";
import { normalizeWatchlist, type ResearchItem } from "./research";

export type Preferences = {
  dashboardLayout: DashboardLayout;
  balanceView: BalanceViewOptions;
  displayCurrency: DisplayCurrency;
  researchWatchlist: ResearchItem[];
};

export function defaultPreferences(): Preferences {
  return {
    dashboardLayout: applyPreset("default"),
    balanceView: normalizeBalanceView({}),
    displayCurrency: "USD",
    researchWatchlist: [],
  };
}

export function normalizePreferences(raw: unknown): Preferences {
  const source = raw && typeof raw === "object" ? (raw as Partial<Preferences>) : {};
  return {
    dashboardLayout: normalizeLayout(source.dashboardLayout),
    balanceView: normalizeBalanceView(source.balanceView),
    displayCurrency: normalizeCurrency(source.displayCurrency),
    researchWatchlist: normalizeWatchlist(source.researchWatchlist),
  };
}

function layoutRank(preset: LayoutPreset): number {
  if (preset === "custom") return 2;
  if (preset === "simple" || preset === "detailed") return 1;
  return 0;
}

/** Guest edits survive sign-in: custom layouts win over an untouched remote default, and saved research is unioned. */
export function mergePreferences(local: Preferences, remote: Preferences | null | undefined): Preferences {
  const left = normalizePreferences(local);
  const right = normalizePreferences(remote);
  const byId = new Map<string, ResearchItem>();
  for (const item of [...right.researchWatchlist, ...left.researchWatchlist]) {
    const prev = byId.get(item.id);
    if (!prev || item.savedAt >= prev.savedAt) byId.set(item.id, item);
  }
  const layout =
    layoutRank(left.dashboardLayout.preset) > layoutRank(right.dashboardLayout.preset)
      ? left.dashboardLayout
      : right.dashboardLayout;
  return {
    dashboardLayout: layout,
    balanceView: right.balanceView,
    displayCurrency: right.displayCurrency === "USD" ? left.displayCurrency : right.displayCurrency,
    researchWatchlist: [...byId.values()].sort((a, b) => b.savedAt - a.savedAt).slice(0, 40),
  };
}
