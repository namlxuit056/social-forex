/** Query `?currencies=USD,EUR` hoặc `?currency=USD` — dùng trên server và client. */
export function parseCalendarCurrencySearchParams(sp: {
  currencies?: string;
  currency?: string;
}): string[] {
  const fromList = (sp.currencies ?? "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((c) => /^[A-Z]{3}$/.test(c));
  const single = (sp.currency ?? "").trim().toUpperCase();
  const merged = [
    ...fromList,
    ...(single && /^[A-Z]{3}$/.test(single) ? [single] : []),
  ];
  return [...new Set(merged)];
}
