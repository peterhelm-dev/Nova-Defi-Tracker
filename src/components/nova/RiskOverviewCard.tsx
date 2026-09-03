import { getSampleRisk } from "@/lib/sampleData";
import { SampleDataBadge } from "./SampleDataBadge";

const LEVEL_STYLES: Record<string, string> = {
  low: "text-positive",
  moderate: "text-warning",
  elevated: "text-warning",
  critical: "text-negative",
  unknown: "text-text-muted",
};

const LEVEL_LABEL: Record<string, string> = {
  low: "Low",
  moderate: "Moderate",
  elevated: "Elevated",
  critical: "Critical",
  unknown: "Unknown",
};

/**
 * Explainable risk summary + factor list, per component-specs/components.md:
 * "Risk levels: low, moderate, elevated, critical, unknown. Every factor
 * links to evidence and updated time. Unknown is not treated as low."
 *
 * No lending-position-level risk data source is connected yet (no
 * health-factor/LTV integration) — this reads from the sample-data adapter
 * and is labeled as such.
 */
export function RiskOverviewCard() {
  const risk = getSampleRisk();
  const updated = new Date(risk.updatedAt).toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-text-secondary">Risk Overview</p>
        <SampleDataBadge />
      </div>

      <div className="mt-4 flex items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-4 border-accent/30 text-2xl font-bold text-foreground">
          {risk.score}
        </div>
        <div>
          <p className={`text-sm font-semibold ${LEVEL_STYLES[risk.level]}`}>
            {LEVEL_LABEL[risk.level] ?? "Unknown"}
          </p>
          <p className="text-xs text-text-muted">Updated {updated}</p>
        </div>
      </div>

      <ul className="mt-5 flex flex-col divide-y divide-border-subtle">
        {risk.factors.map((factor) => (
          <li key={factor.id} className="flex items-center justify-between py-2 text-sm">
            <span className="text-text-secondary">{factor.label}</span>
            <span className={`font-medium ${LEVEL_STYLES[factor.level]}`}>
              {LEVEL_LABEL[factor.level] ?? "Unknown"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
