/**
 * Marks a card as running on the NOVA sample-data adapter rather than a real
 * integration — required whenever illustrative figures are shown, per
 * IMPLEMENTATION_RULES.md ("No fabricated wallet balances in production
 * mode").
 */
export function SampleDataBadge() {
  return (
    <span
      title="This section uses illustrative sample data — no live integration is connected yet."
      className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning"
    >
      Sample data
    </span>
  );
}
