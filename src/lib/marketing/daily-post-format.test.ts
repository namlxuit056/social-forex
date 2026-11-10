import { describe, expect, it } from "vitest";
import {
  campaignUrl,
  composeFacebookPost,
  composeTelegramPost,
  escapeTelegramHtml,
  isVnWeekend,
  vnDay,
} from "./daily-post-format";

describe("vnDay / isVnWeekend", () => {
  it("uses the Vietnam calendar day, not UTC", () => {
    // 2026-11-09 18:30 UTC is already Tuesday 01:30 in Vietnam.
    expect(vnDay(new Date("2026-11-09T18:30:00Z"))).toBe("2026-11-10");
  });

  it("treats Saturday and Sunday in Vietnam as the weekend", () => {
    expect(isVnWeekend(new Date("2026-11-14T03:00:00Z"))).toBe(true); // Sat
    expect(isVnWeekend(new Date("2026-11-15T16:30:00Z"))).toBe(true); // Sun 23:30 VN
    expect(isVnWeekend(new Date("2026-11-15T17:30:00Z"))).toBe(false); // Mon 00:30 VN
    expect(isVnWeekend(new Date("2026-11-13T03:00:00Z"))).toBe(false); // Fri
  });
});

describe("campaignUrl", () => {
  it("tags the link with the channel", () => {
    expect(campaignUrl("https://toolforex.xyz", "/", "telegram")).toBe(
      "https://toolforex.xyz/?utm_source=telegram&utm_medium=social&utm_campaign=daily_gold",
    );
  });
});

describe("compose posts", () => {
  it("escapes HTML in the AI text so Telegram accepts it", () => {
    expect(escapeTelegramHtml("RSI < 30 & giá > EMA")).toBe("RSI &lt; 30 &amp; giá &gt; EMA");
    const post = composeTelegramPost({ headline: "Vàng <test>", body: "a < b", url: "https://x.y/" });
    expect(post).toContain("<b>Vàng &lt;test&gt;</b>");
    expect(post).toContain("a &lt; b");
    expect(post).toContain("không phải lời khuyên đầu tư");
  });

  it("ends the group post with the link, hashtags and disclaimer", () => {
    const post = composeFacebookPost({ body: "Nhận định", url: "https://x.y/" });
    expect(post.startsWith("Nhận định")).toBe(true);
    expect(post).toContain("https://x.y/");
    expect(post).toContain("#XAUUSD");
  });
});
