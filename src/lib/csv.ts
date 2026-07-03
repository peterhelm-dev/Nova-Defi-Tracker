/**
 * Minimal CSV building (RFC 4180) + browser download. Building is pure so it's
 * unit-testable; only the download helper touches the DOM.
 */

export type CsvValue = string | number | null | undefined;

function escapeCell(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function toCsv(headers: string[], rows: CsvValue[][]): string {
  return [headers, ...rows]
    .map((row) => row.map(escapeCell).join(","))
    .join("\r\n");
}

/** e.g. csvFilename("net-worth-history") → "net-worth-history-2026-07-02.csv" */
export function csvFilename(prefix: string, date: Date = new Date()): string {
  return `${prefix}-${date.toISOString().slice(0, 10)}.csv`;
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
