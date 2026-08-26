import { routing } from "@/i18n/routing";

/** Production default when `NEXT_PUBLIC_SITE_URL` is unset (Vercel preview / prod). */
const DEFAULT_ORIGIN = "https://toolforex.xyz";

/** Canonical site origin, no trailing slash. */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) {
    return DEFAULT_ORIGIN;
  }
  return raw.replace(/\/$/, "");
}

/** Absolute URL for a locale-prefixed app path (default locale has no /vi prefix). */
export function absoluteUrl(path: string, locale: string): string {
  const base = getSiteUrl();
  const p = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  if (locale === routing.defaultLocale) {
    return `${base}${p}` || base;
  }
  return `${base}/${locale}${p}`;
}
