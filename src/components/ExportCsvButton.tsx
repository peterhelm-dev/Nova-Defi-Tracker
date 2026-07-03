"use client";

import { csvFilename, downloadCsv } from "@/lib/csv";

/**
 * Small "Export CSV" affordance for cards. `getCsv` is lazy so the CSV is
 * only built on click. Render nothing when there's no data to export.
 */
export function ExportCsvButton({
  filenamePrefix,
  getCsv,
  disabled = false,
}: {
  filenamePrefix: string;
  getCsv: () => string;
  disabled?: boolean;
}) {
  if (disabled) return null;

  return (
    <button
      type="button"
      onClick={() => downloadCsv(csvFilename(filenamePrefix), getCsv())}
      className="rounded-md border border-white/10 px-2.5 py-1 text-xs text-white/50 hover:border-white/25 hover:text-white/80"
    >
      Export CSV
    </button>
  );
}
