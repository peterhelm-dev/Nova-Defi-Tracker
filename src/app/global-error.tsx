"use client";

/**
 * Last-resort boundary for errors thrown in the root layout itself. Must render
 * its own <html>/<body> because the layout that normally provides them crashed.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          background: "#05060a",
          color: "#f5f6fa",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "0 1.5rem",
        }}
      >
        <h1 style={{ fontSize: "1.25rem", margin: 0 }}>Something went wrong</h1>
        <p style={{ maxWidth: "28rem", fontSize: "0.875rem", opacity: 0.6, margin: 0 }}>
          The app failed to load. Your funds are unaffected — this app is
          read-only. Reloading usually fixes it.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            background: "#0052ff",
            color: "#fff",
            border: 0,
            borderRadius: "0.5rem",
            padding: "0.5rem 1rem",
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Reload
        </button>
        {error.digest ? (
          <p style={{ fontSize: "0.75rem", opacity: 0.3, margin: 0 }}>
            Error reference: {error.digest}
          </p>
        ) : null}
      </body>
    </html>
  );
}
