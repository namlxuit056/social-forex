import { routing } from "@/i18n/routing";

/** Path with locale prefix when not default locale (next-intl `as-needed` style URLs). */
export function localizedHref(path: string, locale: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (locale === routing.defaultLocale) return p;
  return `/${locale}${p}`;
}
