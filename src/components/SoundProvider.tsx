"use client";

import { useEffect } from "react";
import type { SoundKind } from "@/lib/experience";
import { markAudioUnlocked, playUiSound } from "@/lib/sounds";

/** Unlocks audio on the first gesture and plays a soft click on controls. */
export function SoundProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      markAudioUnlocked();
      const target = event.target;
      if (!(target instanceof Element)) return;
      const hit = target.closest("button, a, [role='button']");
      if (!hit || hit.getAttribute("data-sound") === "off") return;
      const requested = hit.getAttribute("data-sound");
      const kind: SoundKind =
        requested === "refresh" || requested === "success" ? requested : "click";
      playUiSound(kind);
    }

    function onKeyDown() {
      markAudioUnlocked();
    }

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return children;
}
