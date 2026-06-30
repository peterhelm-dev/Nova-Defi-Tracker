"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

/**
 * Sign-In With Ethereum control. Only meaningful once a wallet is connected:
 * before sign-in the dashboard runs in guest mode (localStorage); after, the
 * portfolio syncs to the server and follows the user across devices.
 */
export function SyncControl() {
  const { isConnected, isAuthed, signIn, signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isConnected) return null;

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  if (isAuthed) {
    return (
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 text-xs text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Synced
        </span>
        <button
          type="button"
          onClick={() => run(signOut)}
          disabled={busy}
          className="text-xs text-white/50 hover:text-white/80 disabled:opacity-50"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end">
      <button
        type="button"
        onClick={() => run(signIn)}
        disabled={busy}
        className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-white/80 hover:border-white/30 hover:text-white disabled:opacity-50"
      >
        {busy ? "Check wallet…" : "Sign in to sync"}
      </button>
      {error ? <span className="mt-1 text-[11px] text-red-400">{error}</span> : null}
    </div>
  );
}
