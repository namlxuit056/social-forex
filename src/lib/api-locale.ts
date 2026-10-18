import type { NextRequest } from "next/server";
import { routing } from "@/i18n/routing";

export type AppLocale = (typeof routing.locales)[number];

/** Infer locale from Referer path (/en/..., /vi/...) or Accept-Language. */
export function localeFromRequest(req: NextRequest): AppLocale {
  const referer = req.headers.get("referer") ?? "";
  const m = referer.match(/\/(en|vi)(?:\/|$)/);
  if (m?.[1] === "en" || m?.[1] === "vi") {
    return m[1];
  }
  const al = (req.headers.get("accept-language") ?? "").toLowerCase();
  if (al.startsWith("vi")) return "vi";
  if (al.startsWith("en")) return "en";
  return routing.defaultLocale;
}

/** Untrusted `?locale=` value → a supported locale (falls back to the default). */
export function parseLocaleParam(raw: string | null | undefined): AppLocale {
  return raw === "en" || raw === "vi" ? raw : routing.defaultLocale;
}
