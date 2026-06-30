"use client";

import { useState } from "react";

type Status = "idle" | "submitting" | "done" | "error";

/**
 * Phase 0 demand-test capture. Posts an email to /api/waitlist so interest in
 * the paid tier can be measured before any billing is built.
 */
export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("submitting");
    setMessage("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, ref: "pricing" }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Could not join the waitlist");
      }
      setStatus("done");
      setMessage("You're on the list — we'll be in touch when Pro is ready.");
      setEmail("");
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  if (status === "done") {
    return <p className="text-sm text-emerald-400">{message}</p>;
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-md flex-col gap-2 sm:flex-row">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@email.com"
        aria-label="Email address"
        className="flex-1 rounded-lg border border-white/15 bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-white/30 focus:border-accent focus:outline-none"
      />
      <button
        type="submit"
        disabled={status === "submitting"}
        className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-60"
      >
        {status === "submitting" ? "Joining…" : "Join waitlist"}
      </button>
      {status === "error" ? (
        <p className="text-sm text-red-400 sm:basis-full">{message}</p>
      ) : null}
    </form>
  );
}
