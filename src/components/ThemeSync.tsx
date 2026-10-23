"use client";

import { useLayoutEffect, useRef } from "react";
import { usePreferences } from "@/hooks/usePreferences";
import { applyTheme, DEFAULT_THEME, readStoredTheme } from "@/lib/themes";

/** Keeps the document theme aligned with localStorage and the synced profile. */
export function ThemeSync() {
  const { prefs, setPrefs } = usePreferences();
  const sawStored = useRef(false);

  useLayoutEffect(() => {
    let next = prefs.theme;
    if (!sawStored.current) {
      sawStored.current = true;
      const stored = readStoredTheme();
      if (prefs.theme === DEFAULT_THEME && stored !== DEFAULT_THEME) next = stored;
    }
    applyTheme(next);
    if (next !== prefs.theme) {
      setPrefs((current) => (current.theme === next ? current : { ...current, theme: next }));
    }
  }, [prefs.theme, setPrefs]);

  return null;
}
