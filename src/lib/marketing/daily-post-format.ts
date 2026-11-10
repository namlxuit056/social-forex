import { formatInTimeZone } from "date-fns-tz";

export const VN_TZ = "Asia/Ho_Chi_Minh";
export const DISCLAIMER_VI = "Thông tin tham khảo, không phải lời khuyên đầu tư.";

export type SocialSource = "telegram" | "facebook" | "tiktok";

/** Calendar day in Vietnam, "YYYY-MM-DD" — one post per symbol per day. */
export function vnDay(date: Date): string {
  return formatInTimeZone(date, VN_TZ, "yyyy-MM-dd");
}

/** Gold's weekend: no fresh session to talk about, so the morning post skips. */
export function isVnWeekend(date: Date): boolean {
  const weekday = Number(formatInTimeZone(date, VN_TZ, "i")); // 1 = Mon … 7 = Sun
  return weekday >= 6;
}

/** Site link tagged so /admin/analytics can tell which channel a visitor came from. */
export function campaignUrl(siteUrl: string, path: string, source: SocialSource): string {
  const url = new URL(path, siteUrl.endsWith("/") ? siteUrl : `${siteUrl}/`);
  url.searchParams.set("utm_source", source);
  url.searchParams.set("utm_medium", "social");
  url.searchParams.set("utm_campaign", "daily_gold");
  return url.toString();
}

export function escapeTelegramHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Channel post: bold headline, the AI body as plain text, link, disclaimer. */
export function composeTelegramPost(input: { headline: string; body: string; url: string }): string {
  return [
    `<b>${escapeTelegramHtml(input.headline)}</b>`,
    "",
    escapeTelegramHtml(input.body.trim()),
    "",
    `👉 Biểu đồ và tín hiệu live: ${input.url}`,
    "",
    `<i>${DISCLAIMER_VI}</i>`,
  ].join("\n");
}

/** Group post: the body reads as a trader sharing a view; the link sits at the end, never alone. */
export function composeFacebookPost(input: { body: string; url: string }): string {
  return [
    input.body.trim(),
    "",
    `👉 Mình theo dõi live ở đây: ${input.url}`,
    "",
    "#XAUUSD #vang #forex #giavang",
    DISCLAIMER_VI,
  ].join("\n");
}
