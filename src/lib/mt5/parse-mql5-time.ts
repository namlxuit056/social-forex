/** MQL5 timestamps look like "2026.08.17 10:00:00" — convert to ISO, or null if unparseable. */
export function parseMql5Time(v: unknown): string | null {
  if (typeof v !== "string" || !v) return null;
  const iso = v.replace(/^(\d{4})\.(\d{2})\.(\d{2})/, "$1-$2-$3").replace(" ", "T");
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}
