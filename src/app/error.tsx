"use client";

import { useEffect } from "react";

/**
 * Route-level error boundary. Keeps a crash in one part of the dashboard from
 * blanking the whole app, and gives the user a way back.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface in the browser console / server logs; swap in an error
    // monitoring SDK (e.g. Sentry) here when one is configured.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15 text-2xl">
        ⚠️
      </span>
      <h1 className="text-xl font-semibold text-white">Something went wrong</h1>
      <p className="max-w-md text-sm text-white/60">
        The dashboard hit an unexpected error. Your funds are unaffected — this
        app is read-only. Try again, and if it keeps happening let us know via
        the support page.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90"
        >
          Try again
        </button>
        <a
          href="/support"
          className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-white/80 hover:border-white/30 hover:text-white"
        >
          Support
        </a>
      </div>
      {error.digest ? (
        <p className="text-xs text-white/30">Error reference: {error.digest}</p>
      ) : null}
    </div>
  );
}
