"use client";

import { useCallback, useSyncExternalStore } from "react";
import { storage } from "./storage";

const cache = new Map<string, unknown>();
const listeners = new Map<string, Set<() => void>>();

function getSnapshot<T>(key: string, fallback: T): T {
  if (!cache.has(key)) {
    cache.set(key, storage.read<T>(key, fallback));
  }
  return cache.get(key) as T;
}

function subscribe(key: string, listener: () => void) {
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  set.add(listener);
  return () => set?.delete(listener);
}

function notify(key: string) {
  listeners.get(key)?.forEach((listener) => listener());
}

/**
 * A small useState-like hook backed by localStorage and shared across every
 * component reading the same key. Uses useSyncExternalStore (rather than
 * useEffect + setState) so server/first-paint render the fallback and the
 * real persisted value swaps in without a hydration mismatch.
 */
export function usePersistedState<T>(key: string, fallback: T) {
  const value = useSyncExternalStore(
    (listener) => subscribe(key, listener),
    () => getSnapshot(key, fallback),
    () => fallback,
  );

  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      const prev = getSnapshot(key, fallback);
      const resolved = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
      cache.set(key, resolved);
      storage.write(key, resolved);
      notify(key);
    },
    [key, fallback],
  );

  return [value, setValue] as const;
}
