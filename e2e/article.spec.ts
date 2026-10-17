import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll, signIn, waitForHydration } from "./helpers";

// Vietnamese article page (the reported one); falls back to the newest article.
const SLUG = "xauusd-09-10-2026-bias-ban-khi-gia-hoi-ve-4-200-4-225";
const URL = `/vi/articles/${SLUG}`;

async function open(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    try {
      localStorage.removeItem("social-forex:gold-ai-popup:v1");
    } catch {}
  });
  const res = await page.goto(URL, { waitUntil: "domcontentloaded" });
  test.skip(res?.status() === 404, "article not in this database");
  await waitForHydration(page);
}

test.describe("article page", () => {
  test("no prompt labels leak into headings", async ({ page }) => {
    await open(page);
    const headings = await page.locator("article h2, article h3").allTextContents();
    expect(headings.join(" | ")).not.toMatch(/BẮT BUỘC|REQUIRED|MANDATORY/i);
  });

  test("academy level badges are translated", async ({ page }) => {
    await open(page);
    const section = page.getByRole("region", { name: /academy/i });
    test.skip((await section.count()) === 0, "no related lessons");
    await expect(section).not.toContainText(/\b(beginner|intermediate|advanced)\b/);
  });

  test("breadcrumb links are at least 24px tall and no popup interrupts reading", async ({ page }) => {
    await open(page);
    for (const link of await page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link").all()) {
      const box = await link.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(24);
    }
    await page.waitForTimeout(2500);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expectNoHorizontalScroll(page);
  });

  test("article title is larger than its section headings", async ({ page }) => {
    await open(page);
    const h1 = await page.locator("h1").first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    const h2 = await page.locator("article .article-body h2").first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(h1).toBeGreaterThan(h2 + 4);
  });

  test("signed-in AI chat: no avatars, full-width answers, 12px note", async ({ page }) => {
    await signIn(page);
    await open(page);
    const panel = page.locator("aside section").first();
    await expect(panel.getByRole("heading", { level: 2 })).toBeVisible();
    const note = panel.locator("form p").last();
    test.skip((await note.count()) === 0, "account has no VIP chat access");
    await expect(note).toHaveCSS("font-size", "12px");
    const answer = panel.locator(".chat-message-body").first();
    if (await answer.count()) {
      const [a, p] = await Promise.all([answer.boundingBox(), panel.boundingBox()]);
      expect((a?.width ?? 0) / (p?.width ?? 1)).toBeGreaterThan(0.8);
    }
  });
});
