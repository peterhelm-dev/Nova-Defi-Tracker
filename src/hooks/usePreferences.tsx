"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCloudSync } from "@/lib/cloudSync";
import {
  defaultPreferences,
  mergePreferences,
  normalizePreferences,
  type Preferences,
} from "@/lib/preferences";
import { usePersistedState } from "@/lib/usePersistedState";

const STORAGE_KEY = "nova:preferences";

type PreferencesContextValue = {
  prefs: Preferences;
  setPrefs: (next: Preferences | ((prev: Preferences) => Preferences)) => void;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const { authedAddress } = useAuth();
  const [stored, setStored] = usePersistedState<Preferences>(STORAGE_KEY, defaultPreferences());
  const prefs = useMemo(() => normalizePreferences(stored), [stored]);

  const setPrefs = useCallback(
    (next: Preferences | ((prev: Preferences) => Preferences)) => {
      setStored((prev) => {
        const current = normalizePreferences(prev);
        return typeof next === "function" ? next(current) : next;
      });
    },
    [setStored],
  );

  const acceptRemote = useCallback(
    (next: Preferences) => {
      setStored(normalizePreferences(next));
    },
    [setStored],
  );

  useCloudSync(
    "/api/preferences",
    "preferences",
    prefs,
    acceptRemote,
    (local, remote) => mergePreferences(local, remote),
    authedAddress,
  );

  const value = useMemo(() => ({ prefs, setPrefs }), [prefs, setPrefs]);
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used within PreferencesProvider");
  return ctx;
}
