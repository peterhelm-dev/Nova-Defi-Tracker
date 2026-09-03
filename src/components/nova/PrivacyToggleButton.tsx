"use client";

import { usePrivacyMode } from "@/lib/privacy";
import { EyeIcon, EyeOffIcon } from "./icons";

/**
 * Masks financial figures without changing layout (see maskValue in
 * lib/privacy.tsx). Does not affect on-chain visibility — the tooltip says so
 * explicitly, per component-specs/components.md.
 */
export function PrivacyToggleButton() {
  const { privacyMode, togglePrivacyMode } = usePrivacyMode();

  return (
    <button
      type="button"
      onClick={togglePrivacyMode}
      aria-pressed={privacyMode}
      title="Privacy mode masks the figures shown here — it doesn't change what's visible onchain."
      className="flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle text-text-secondary transition-colors duration-200 hover:text-foreground"
    >
      {privacyMode ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
      <span className="sr-only">
        {privacyMode ? "Privacy mode on — show figures" : "Privacy mode off — hide figures"}
      </span>
    </button>
  );
}
