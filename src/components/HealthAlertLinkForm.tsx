"use client";

import { useState } from "react";

/**
 * The email link only opens this page. The write happens on the button,
 * so a mail scanner that fetches the URL does not confirm or unsubscribe.
 */
export function HealthAlertLinkForm({
  token,
  action,
}: {
  token: string;
  action: "confirm" | "unsubscribe";
}) {
  const [phase, setPhase] = useState<"idle" | "working" | "done" | "error">("idle");
  const [outcome, setOutcome] = useState<string>("");
  const confirm = action === "confirm";

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPhase("working");
    try {
      const res = await fetch(confirm ? "/api/health-alerts/confirm" : "/api/health-alerts/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = (await res.json().catch(() => ({}))) as { outcome?: string; error?: string };
      if (!res.ok && !data.outcome) throw new Error(data.error ?? "That didn't work. Try the link again.");
      setOutcome(data.outcome ?? "invalid");
      setPhase("done");
    } catch (error) {
      setOutcome(error instanceof Error ? error.message : "That didn't work. Try the link again.");
      setPhase("error");
    }
  }

  if (phase === "done") {
    if (confirm && outcome === "confirmed") {
      return (
        <p>
          This address is confirmed. Novafolio will email you when an Aave or Compound health factor for this wallet drops below your threshold. The check runs once a day. While it stays below that line, you get at most one email every 6 days. This is information, not a recommendation.
        </p>
      );
    }
    if (!confirm && outcome === "unsubscribed") {
      return <p>Email alerts for this wallet are off. The address, threshold, and email for this subscription have been deleted.</p>;
    }
    return (
      <p>
        {confirm
          ? "This confirmation link is not valid. It may have already been used. You can request a new one from the portfolio page."
          : "This unsubscribe link is not valid. If you still get mail, use the link in the latest message."}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col items-start gap-3">
      <p>
        {confirm
          ? "Confirm that this inbox should get a message when an Aave or Compound health factor for the wallet in the email drops below the threshold you chose. This is information, not a recommendation."
          : "This stops health-factor email for the wallet in that message and deletes the address, threshold, and email we stored for it."}
      </p>
      <button
        type="submit"
        disabled={phase === "working"}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-text-inverse hover:bg-accent/90 disabled:opacity-60"
      >
        {phase === "working" ? "Working…" : confirm ? "Confirm this alert" : "Unsubscribe"}
      </button>
      {phase === "error" ? <p className="text-negative">{outcome}</p> : null}
    </form>
  );
}
