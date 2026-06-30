"use client";

import { useEffect, useRef } from "react";

/**
 * Two-way sync between a locally-persisted value and a server endpoint, active
 * only while signed in (`authedAddress` set).
 *
 * On sign-in it pulls the server copy, merges it with whatever guest data is in
 * localStorage (so nothing tracked-before-signing-in is lost), and writes the
 * merged result both locally and back to the server. After that, local changes
 * are debounced up to the server. When signed out it does nothing, so guest
 * mode is unchanged.
 */
export function useCloudSync<T>(
  endpoint: string,
  field: string,
  value: T,
  setValue: (next: T) => void,
  merge: (local: T, remote: T) => T,
  authedAddress: string | null,
): void {
  const syncedFor = useRef<string | null>(null);
  const ready = useRef(false);
  // Read the latest value/merge inside the pull effect without re-triggering it.
  const valueRef = useRef(value);
  const mergeRef = useRef(merge);
  useEffect(() => {
    valueRef.current = value;
    mergeRef.current = merge;
  });

  // Initial pull + merge whenever the signed-in address changes.
  useEffect(() => {
    if (!authedAddress) {
      syncedFor.current = null;
      ready.current = false;
      return;
    }
    if (syncedFor.current === authedAddress) return;
    syncedFor.current = authedAddress;
    ready.current = false;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(endpoint, { credentials: "same-origin" });
        if (res.ok && !cancelled) {
          const data = (await res.json()) as Record<string, unknown>;
          const remote = data[field] as T;
          setValue(mergeRef.current(valueRef.current, remote));
        }
      } catch {
        // Offline or server error — keep using local data; retry next change.
      } finally {
        if (!cancelled) ready.current = true;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authedAddress, endpoint, field, setValue]);

  // Debounced push on local change, once the initial pull has settled.
  useEffect(() => {
    if (!authedAddress || !ready.current) return;
    const id = setTimeout(() => {
      void fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ [field]: value }),
      }).catch(() => {});
    }, 800);
    return () => clearTimeout(id);
  }, [value, authedAddress, endpoint, field]);
}
