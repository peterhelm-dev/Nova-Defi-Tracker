"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";

const STORAGE_KEY = "nova.privacy-mode";

type PrivacyContextValue = {
  privacyMode: boolean;
  togglePrivacyMode: () => void;
};

const PrivacyContext = createContext<PrivacyContextValue | null>(null);

const listeners = new Set<() => void>();

function readPrivacy(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

function emit() {
  listeners.forEach((listener) => listener());
}

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const privacyMode = useSyncExternalStore(subscribe, readPrivacy, () => false);

  const togglePrivacyMode = useCallback(() => {
    const next = !readPrivacy();
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      // The toggle still applies for listeners in this tab.
    }
    emit();
  }, []);

  const value = useMemo<PrivacyContextValue>(
    () => ({ privacyMode, togglePrivacyMode }),
    [privacyMode, togglePrivacyMode],
  );

  return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>;
}

export function usePrivacyMode(): PrivacyContextValue {
  const ctx = useContext(PrivacyContext);
  if (!ctx) throw new Error("usePrivacyMode must be used within PrivacyProvider");
  return ctx;
}

/**
 * Masks a formatted figure when privacy mode is on. Keeps the DOM node's
 * accessible name intact (aria-label carries the real value) so screen
 * readers aren't affected by the visual mask, per DESIGN_SPEC.md.
 */
export function maskValue(formatted: string, privacyMode: boolean): string {
  if (!privacyMode) return formatted;
  return "••••";
}
