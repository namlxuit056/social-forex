/** Chỉ cho phép path nội bộ — tránh open redirect. */
export function safeCallbackPath(
  raw: string | null | undefined,
  fallback = "/dashboard",
): string {
  if (raw == null || typeof raw !== "string") return fallback;
  const t = raw.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return fallback;
  return t;
}
