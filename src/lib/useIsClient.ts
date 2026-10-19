"use client";

import { useSyncExternalStore } from "react";

/**
 * False during SSR and hydration, true after. Use this instead of a
 * `mounted` flag set from an effect — wagmi restores the wallet only on the
 * client, and the server render has to match the first client render.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
