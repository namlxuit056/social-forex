import { revalidatePath } from "next/cache";
import { routing } from "@/i18n/routing";

/**
 * Revalidate a path across all locales, respecting the "as-needed" locale
 * prefix (default locale has no prefix, e.g. `/journal` not `/en/journal`).
 */
export function revalidateLocalizedPath(path: string, type?: "page" | "layout") {
  for (const locale of routing.locales) {
    const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
    revalidatePath(`${prefix}${path}`, type);
  }
}
