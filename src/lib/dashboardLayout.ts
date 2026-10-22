export const WIDGETS = [
  "net-worth",
  "performance",
  "history",
  "allocation",
  "chains",
  "movers",
  "defi",
  "holdings",
] as const;

export type WidgetId = (typeof WIDGETS)[number];
export type WidgetSize = "sm" | "md" | "lg";
export type LayoutPreset = "default" | "simple" | "detailed" | "custom";

export type LayoutItem = {
  id: WidgetId;
  visible: boolean;
  size: WidgetSize;
};

export type DashboardLayout = {
  preset: LayoutPreset;
  items: LayoutItem[];
};

export const WIDGET_LABELS: Record<WidgetId, string> = {
  "net-worth": "Net worth",
  performance: "Performance",
  history: "History",
  allocation: "Allocation",
  chains: "By chain",
  movers: "Top movers",
  defi: "DeFi positions",
  holdings: "Balances",
};

const SIZES = new Set<WidgetSize>(["sm", "md", "lg"]);

function item(id: WidgetId, size: WidgetSize, visible = true): LayoutItem {
  return { id, size, visible };
}

export const DEFAULT_LAYOUT: DashboardLayout = {
  preset: "default",
  items: [
    item("net-worth", "lg"),
    item("performance", "lg"),
    item("history", "md"),
    item("allocation", "sm"),
    item("chains", "md"),
    item("movers", "md"),
    item("defi", "lg"),
    item("holdings", "lg"),
  ],
};

export const SIMPLE_LAYOUT: DashboardLayout = {
  preset: "simple",
  items: [
    item("net-worth", "lg"),
    item("history", "lg"),
    item("holdings", "lg"),
    item("performance", "lg", false),
    item("allocation", "sm", false),
    item("chains", "md", false),
    item("movers", "md", false),
    item("defi", "lg", false),
  ],
};

export const DETAILED_LAYOUT: DashboardLayout = {
  preset: "detailed",
  items: DEFAULT_LAYOUT.items.map((entry) => ({ ...entry, visible: true })),
};

const PRESETS: Record<Exclude<LayoutPreset, "custom">, DashboardLayout> = {
  default: DEFAULT_LAYOUT,
  simple: SIMPLE_LAYOUT,
  detailed: DETAILED_LAYOUT,
};

export function isWidgetId(value: unknown): value is WidgetId {
  return typeof value === "string" && (WIDGETS as readonly string[]).includes(value);
}

export function normalizeLayout(raw: unknown): DashboardLayout {
  const source = raw && typeof raw === "object" ? (raw as Partial<DashboardLayout>) : {};
  const seen = new Set<WidgetId>();
  const items: LayoutItem[] = [];
  const fallback = new Map(DEFAULT_LAYOUT.items.map((entry) => [entry.id, entry]));

  if (Array.isArray(source.items)) {
    for (const entry of source.items) {
      if (!entry || typeof entry !== "object") continue;
      const candidate = entry as Partial<LayoutItem>;
      if (!isWidgetId(candidate.id) || seen.has(candidate.id)) continue;
      seen.add(candidate.id);
      const base = fallback.get(candidate.id)!;
      items.push({
        id: candidate.id,
        visible: candidate.visible !== false,
        size: SIZES.has(candidate.size as WidgetSize) ? (candidate.size as WidgetSize) : base.size,
      });
    }
  }

  for (const id of WIDGETS) {
    if (!seen.has(id)) items.push({ ...fallback.get(id)! });
  }

  const preset = source.preset;
  return {
    preset: preset === "simple" || preset === "detailed" || preset === "custom" || preset === "default" ? preset : "default",
    items,
  };
}

export function applyPreset(preset: Exclude<LayoutPreset, "custom">): DashboardLayout {
  return normalizeLayout(PRESETS[preset]);
}

export function moveWidget(layout: DashboardLayout, id: WidgetId, direction: -1 | 1): DashboardLayout {
  const items = layout.items.map((entry) => ({ ...entry }));
  const index = items.findIndex((entry) => entry.id === id);
  const next = index + direction;
  if (index < 0 || next < 0 || next >= items.length) return layout;
  const [moved] = items.splice(index, 1);
  items.splice(next, 0, moved);
  return { preset: "custom", items };
}

export function reorderWidget(layout: DashboardLayout, fromId: WidgetId, toId: WidgetId): DashboardLayout {
  if (fromId === toId) return layout;
  const items = layout.items.map((entry) => ({ ...entry }));
  const from = items.findIndex((entry) => entry.id === fromId);
  const to = items.findIndex((entry) => entry.id === toId);
  if (from < 0 || to < 0) return layout;
  const [moved] = items.splice(from, 1);
  items.splice(to, 0, moved);
  return { preset: "custom", items };
}

export function toggleWidget(layout: DashboardLayout, id: WidgetId): DashboardLayout {
  return {
    preset: "custom",
    items: layout.items.map((entry) => (entry.id === id ? { ...entry, visible: !entry.visible } : entry)),
  };
}

const SIZE_CYCLE: WidgetSize[] = ["sm", "md", "lg"];

export function cycleWidgetSize(layout: DashboardLayout, id: WidgetId): DashboardLayout {
  return {
    preset: "custom",
    items: layout.items.map((entry) => {
      if (entry.id !== id) return entry;
      const index = SIZE_CYCLE.indexOf(entry.size);
      return { ...entry, size: SIZE_CYCLE[(index + 1) % SIZE_CYCLE.length] };
    }),
  };
}

export function widgetSpan(size: WidgetSize): string {
  if (size === "sm") return "lg:col-span-4";
  if (size === "md") return "lg:col-span-8";
  return "lg:col-span-12";
}
