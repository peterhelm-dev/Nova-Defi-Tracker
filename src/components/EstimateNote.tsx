import { ESTIMATE_NOTE } from "@/lib/disclaimers";

/**
 * Short note beside a yield, APY, health factor, or pool figure.
 * text-muted on surface, raised surface, and the page background meets WCAG AA in every theme.
 */
export function EstimateNote({ className = "" }: { className?: string }) {
  return (
    <span className={`text-xs font-normal normal-case tracking-normal text-text-muted ${className}`}>
      {ESTIMATE_NOTE}
    </span>
  );
}
