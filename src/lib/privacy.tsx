"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "nova.privacy-mode";

type PrivacyContextValue = {
  privacyMode: boolean;
  togglePrivacyMode: () => void;
};

const PrivacyContext = createContext<PrivacyContextValue | null>(null);

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [privacyMode, setPrivacyMode] = useState(false);

  useEffect(() => {
    try {
      setPrivacyMode(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      // Storage unavailable (private mode, disabled) — default stays off.
    }
  }, []);

  const value = useMemo<PrivacyContextValue>(
    () => ({
      privacyMode,
      togglePrivacyMode: () =>
        setPrivacyMode((prev) => {
          const next = !prev;
          try {
            window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
          } catch {
            // Ignore — the toggle still works for this session.
          }
          return next;
        }),
    }),
    [privacyMode],
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
