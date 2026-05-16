import { routing } from "@/i18n/routing";

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

/** Callback dùng với next-intl router: router tự thêm locale, nên path không được có /en hoặc /vi phía trước. */
export function safeLocalizedCallbackPath(
  raw: string | null | undefined,
  fallback = "/dashboard",
): string {
  const path = safeCallbackPath(raw, fallback);

  for (const locale of routing.locales) {
    const prefix = `/${locale}`;
    if (path === prefix) return "/";
    if (path.startsWith(`${prefix}/`)) return path.slice(prefix.length);
  }

  return path;
}
