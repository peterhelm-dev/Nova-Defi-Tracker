"use client";

import { useState, type CSSProperties } from "react";
import { TOUR_STEPS, TOUR_STORAGE_KEY, tourIsComplete } from "@/lib/experience";
import { useIsClient } from "@/lib/useIsClient";
import { usePersistedState } from "@/lib/usePersistedState";

function visibleTarget(selector: string): HTMLElement | null {
  if (typeof document === "undefined") return null;
  for (const node of document.querySelectorAll(selector)) {
    if (!(node instanceof HTMLElement)) continue;
    const rect = node.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return node;
  }
  return null;
}

/**
 * A short tour of the main areas. Shown once, skippable, and reopened from
 * Settings by clearing the same localStorage flag.
 */
export function GuidedTour() {
  const isClient = useIsClient();
  const [storedComplete, setStoredComplete] = usePersistedState(TOUR_STORAGE_KEY, false);
  const complete = tourIsComplete(storedComplete);
  const [step, setStep] = useState(0);
  const [wasComplete, setWasComplete] = useState(complete);
  if (wasComplete !== complete) {
    setWasComplete(complete);
    if (!complete) setStep(0);
  }

  if (!isClient || complete) return null;

  const current = TOUR_STEPS[Math.min(step, TOUR_STEPS.length - 1)];
  const target = current.target ? visibleTarget(current.target) : null;
  const rect = target?.getBoundingClientRect();
  const last = step >= TOUR_STEPS.length - 1;

  let cardStyle: CSSProperties = {
    left: "50%",
    top: "18%",
    transform: "translateX(-50%)",
    width: "min(22rem, calc(100vw - 2rem))",
  };
  if (rect) {
    const width = Math.min(320, window.innerWidth - 24);
    let top = rect.bottom + 12;
    const left = Math.min(Math.max(12, rect.left), window.innerWidth - width - 12);
    if (top + 200 > window.innerHeight) top = Math.max(12, rect.top - 200);
    cardStyle = { top, left, width };
  }

  function finish() {
    setStoredComplete(true);
  }

  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        aria-label="Skip tour"
        className="absolute inset-0 bg-background/70"
        onClick={finish}
      />
      {rect ? (
        <div
          className="pointer-events-none absolute rounded-xl ring-2 ring-accent"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
          }}
        />
      ) : null}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        className="absolute z-10 rounded-2xl border border-border-subtle bg-surface-raised p-4 shadow-card"
        style={cardStyle}
      >
        <p className="text-xs font-medium tracking-wide text-accent uppercase">
          {step + 1} of {TOUR_STEPS.length}
        </p>
        <h2 id="tour-title" className="mt-1 text-lg font-semibold text-foreground">
          {current.title}
        </h2>
        <p className="mt-1 text-sm text-text-secondary">{current.body}</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={finish}
            className="text-sm text-text-muted hover:text-foreground"
          >
            Skip
          </button>
          <button
            type="button"
            autoFocus
            onClick={() => (last ? finish() : setStep((value) => value + 1))}
            className="pressable rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-text-inverse"
          >
            {last ? "Done" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
