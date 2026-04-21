import { getTranslations } from "next-intl/server";

const GROUPS = {
  explore: ["/quotes", "/tools", "/dashboard"],
  trading: ["/desk", "/chart", "/calendar", "/signals"],
  community: ["/forum", "/leaderboard", "/messages"],
  learn: ["/start", "/academy", "/resources", "/webinar"],
  risk: ["/brokers", "/partners", "/profile"],
} as const;

const LABEL_KEY: Record<string, string> = {
  "/desk": "labelDesk",
  "/quotes": "labelQuotes",
  "/tools": "labelTools",
  "/dashboard": "labelDashboard",
  "/chart": "labelChart",
  "/calendar": "labelCalendar",
  "/signals": "labelSignals",
  "/forum": "labelForum",
  "/leaderboard": "labelLeaderboard",
  "/messages": "labelMessages",
  "/start": "labelStartHere",
  "/academy": "labelAcademy",
  "/resources": "labelResources",
  "/webinar": "labelWebinar",
  "/brokers": "labelBrokers",
  "/partners": "labelPartners",
  "/profile": "labelProfile",
};

export type PageCtaGroup = keyof typeof GROUPS;

export async function pageCtaItems(
  ...groups: PageCtaGroup[]
): Promise<{ href: string; label: string }[]> {
  const t = await getTranslations("pageCtas");
  const out: { href: string; label: string }[] = [];
  for (const g of groups) {
    for (const href of GROUPS[g]) {
      const key = LABEL_KEY[href];
      out.push({ href, label: t(key as "labelQuotes") });
    }
  }
  return out;
}
