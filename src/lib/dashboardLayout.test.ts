import { describe, expect, it } from "vitest";
import {
  applyPreset,
  cycleWidgetSize,
  DEFAULT_LAYOUT,
  moveWidget,
  normalizeLayout,
  toggleWidget,
  WIDGETS,
} from "./dashboardLayout";
import { mergePreferences, normalizePreferences } from "./preferences";

describe("dashboard layout", () => {
  it("fills missing widgets and drops unknown ones", () => {
    const layout = normalizeLayout({
      preset: "custom",
      items: [
        { id: "holdings", visible: true, size: "sm" },
        { id: "not-a-widget", visible: true, size: "lg" },
        { id: "holdings", visible: false, size: "lg" },
      ],
    });
    expect(layout.items.map((item) => item.id)).toEqual([
      "holdings",
      "net-worth",
      "performance",
      "history",
      "allocation",
      "chains",
      "movers",
      "defi",
    ]);
    expect(layout.items).toHaveLength(WIDGETS.length);
    expect(new Set(layout.items.map((item) => item.id)).size).toBe(WIDGETS.length);
    expect(layout.items[0]).toMatchObject({ id: "holdings", size: "sm", visible: true });
  });

  it("moves a widget and marks the layout custom", () => {
    const moved = moveWidget(DEFAULT_LAYOUT, "holdings", -1);
    expect(moved.preset).toBe("custom");
    expect(moved.items.at(-1)?.id).toBe("defi");
    expect(moved.items.at(-2)?.id).toBe("holdings");
    expect(moveWidget(DEFAULT_LAYOUT, "net-worth", -1)).toBe(DEFAULT_LAYOUT);
  });

  it("hides, resizes, and resets through presets", () => {
    const hidden = toggleWidget(DEFAULT_LAYOUT, "movers");
    expect(hidden.items.find((item) => item.id === "movers")?.visible).toBe(false);
    const resized = cycleWidgetSize(hidden, "allocation");
    expect(resized.items.find((item) => item.id === "allocation")?.size).toBe("md");
    const simple = applyPreset("simple");
    expect(simple.preset).toBe("simple");
    expect(simple.items.filter((item) => item.visible).map((item) => item.id)).toEqual([
      "net-worth",
      "history",
      "holdings",
    ]);
    expect(applyPreset("default").preset).toBe("default");
  });

  it("round-trips a custom layout through JSON the way localStorage does", () => {
    const layout = cycleWidgetSize(moveWidget(DEFAULT_LAYOUT, "holdings", -1), "holdings");
    const stored = JSON.parse(JSON.stringify({ dashboardLayout: layout, balanceView: { groupBy: "chain", hideDust: true } }));
    const restored = normalizePreferences(stored);
    expect(restored.dashboardLayout).toEqual(normalizeLayout(layout));
    expect(restored.balanceView.groupBy).toBe("chain");
    expect(restored.balanceView.hideDust).toBe(true);
    const again = normalizePreferences(JSON.parse(JSON.stringify(restored)));
    expect(again).toEqual(restored);
  });
});

describe("preference merge", () => {
  it("keeps a custom guest layout and unions the watchlist", () => {
    const local = normalizePreferences({
      dashboardLayout: toggleWidget(applyPreset("default"), "chains"),
      displayCurrency: "EUR",
      researchWatchlist: [{ id: "token:eth", kind: "token", label: "ETH", subtitle: "", savedAt: 2 }],
    });
    const remote = normalizePreferences({
      dashboardLayout: applyPreset("default"),
      displayCurrency: "USD",
      researchWatchlist: [{ id: "pool:a", kind: "pool", label: "Aave", subtitle: "", savedAt: 1 }],
    });
    const merged = mergePreferences(local, remote);
    expect(merged.dashboardLayout.preset).toBe("custom");
    expect(merged.dashboardLayout.items.find((item) => item.id === "chains")?.visible).toBe(false);
    expect(merged.researchWatchlist.map((item) => item.id).sort()).toEqual(["pool:a", "token:eth"]);
    expect(merged.displayCurrency).toBe("EUR");
    expect(merged.theme).toBe("violet");
  });
});
