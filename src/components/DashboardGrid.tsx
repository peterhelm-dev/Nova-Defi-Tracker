"use client";

import { useState } from "react";
import {
  applyPreset,
  cycleWidgetSize,
  moveWidget,
  reorderWidget,
  toggleWidget,
  WIDGET_LABELS,
  widgetSpan,
  type DashboardLayout,
  type WidgetId,
} from "@/lib/dashboardLayout";

const SIZE_LABEL = { sm: "Narrow", md: "Wide", lg: "Full" } as const;

export function DashboardGrid({
  layout,
  editing,
  onChange,
  onEditingChange,
  render,
}: {
  layout: DashboardLayout;
  editing: boolean;
  onChange: (layout: DashboardLayout) => void;
  onEditingChange: (editing: boolean) => void;
  render: (id: WidgetId) => React.ReactNode;
}) {
  const [dragId, setDragId] = useState<WidgetId | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-text-muted">
          {editing
            ? "Drag a card, or use the arrows. Saved on this device, and to your account when sync is available."
            : "Your portfolio"}
        </p>
        <div className="flex flex-wrap gap-2">
          {editing ? (
            <>
              <button type="button" className="layout-chip" onClick={() => onChange(applyPreset("simple"))}>
                Simple
              </button>
              <button type="button" className="layout-chip" onClick={() => onChange(applyPreset("detailed"))}>
                Detailed
              </button>
              <button type="button" className="layout-chip" onClick={() => onChange(applyPreset("default"))}>
                Reset to default
              </button>
              <button
                type="button"
                className="pressable rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-text-inverse"
                onClick={() => onEditingChange(false)}
              >
                Done
              </button>
            </>
          ) : (
            <button type="button" className="layout-chip" onClick={() => onEditingChange(true)}>
              Edit layout
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <ul className="flex flex-col gap-1 rounded-2xl border border-border-subtle bg-surface p-3">
          {layout.items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-1">
              <span className="text-sm text-foreground">{WIDGET_LABELS[item.id]}</span>
              <span className="flex gap-2">
                <button type="button" className="text-xs text-text-muted hover:text-foreground" onClick={() => onChange(moveWidget(layout, item.id, -1))}>
                  Up
                </button>
                <button type="button" className="text-xs text-text-muted hover:text-foreground" onClick={() => onChange(moveWidget(layout, item.id, 1))}>
                  Down
                </button>
                <button type="button" className="text-xs text-accent" onClick={() => onChange(toggleWidget(layout, item.id))}>
                  {item.visible ? "Hide" : "Show"}
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {layout.items
          .filter((item) => editing || item.visible)
          .map((item) => (
            <section
              key={item.id}
              data-widget={item.id}
              draggable={editing}
              onDragStart={() => setDragId(item.id)}
              onDragOver={(event) => {
                if (editing) event.preventDefault();
              }}
              onDragEnd={() => setDragId(null)}
              onDrop={() => {
                if (dragId) onChange(reorderWidget(layout, dragId, item.id));
                setDragId(null);
              }}
              className={`${widgetSpan(item.size)} ${editing && !item.visible ? "opacity-50" : ""}`}
            >
              {editing ? (
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-accent/50 bg-accent/5 px-3 py-2">
                  <span className="text-xs font-medium tracking-wide text-accent uppercase">
                    {WIDGET_LABELS[item.id]}
                  </span>
                  <span className="flex gap-2">
                    <button type="button" className="text-xs text-text-secondary" onClick={() => onChange(cycleWidgetSize(layout, item.id))}>
                      {SIZE_LABEL[item.size]}
                    </button>
                    <button type="button" className="text-xs text-text-secondary" onClick={() => onChange(toggleWidget(layout, item.id))}>
                      {item.visible ? "Hide" : "Show"}
                    </button>
                  </span>
                </div>
              ) : null}
              {item.visible ? render(item.id) : <p className="text-sm text-text-muted">Hidden</p>}
            </section>
          ))}
      </div>
    </div>
  );
}
