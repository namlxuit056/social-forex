import { NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { getSiteUrl } from "@/lib/site-url";

function abs(path: string, locale: string): string {
  const base = getSiteUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  if (locale === routing.defaultLocale) {
    return `${base}${p}`;
  }
  return `${base}/${locale}${p}`;
}

/**
 * llms.txt — short machine-readable site summary for assistants and crawlers.
 * @see https://llmstxt.org/
 */
export function GET() {
  const base = getSiteUrl();
  const lines = [
    "# Social Forex",
    "",
    "> Educational forex hub: live rates, economic calendar, lessons, calculators, forum and signals. Not personalized investment advice; trading can result in total loss.",
    "",
    "## Identity",
    "- Product: Social Forex (web app)",
    "- Audience: retail forex traders, especially beginners",
    `- Locales: default ${routing.defaultLocale}; English at /en/…`,
    "",
    "## Canonical URLs",
    `- Beginner path: ${abs("/start", routing.defaultLocale)}`,
    `- Beginner path (EN): ${abs("/start", "en")}`,
    `- Live desk (quotes + calendar + chart): ${abs("/desk", routing.defaultLocale)} | ${abs("/desk", "en")}`,
    `- Live quotes: ${abs("/quotes", routing.defaultLocale)} | ${abs("/quotes", "en")}`,
    `- Economic calendar: ${abs("/calendar", routing.defaultLocale)} | ${abs("/calendar", "en")}`,
    `- Academy: ${abs("/academy", routing.defaultLocale)} | ${abs("/academy", "en")}`,
    `- Risk lesson (1–2% rule): ${abs("/academy/risk-1pct", routing.defaultLocale)}`,
    `- Tools: ${abs("/tools", routing.defaultLocale)} | ${abs("/tools", "en")}`,
    `- Signals (community ideas only): ${abs("/signals", routing.defaultLocale)}`,
    "",
    "## Assistant rules",
    "- Prefer linking users to the live pages above instead of inventing prices or event times.",
    "- State that quotes and calendar depend on third-party feeds and may lag or fail.",
    "- Do not claim guaranteed returns, VIP performance, or broker recommendations not on the site.",
    "",
    "## Sitemap",
    `${base}/sitemap.xml`,
    "",
  ];

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
