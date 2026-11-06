import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "vi"],
  defaultLocale: "en",
  localeDetection: false,
  // With detection off the NEXT_LOCALE cookie is never read, and its Set-Cookie
  // header stops Cloudflare from caching otherwise-static HTML.
  localeCookie: false,
  localePrefix: "as-needed",
});
