import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll, gotoPage } from "./helpers";

const PAGES = [
  "/forum",
  "/academy",
  "/articles",
  "/challenge",
  "/missions",
  "/start",
  "/webinar",
  "/resources",
  "/brokers",
  "/partners",
];

test.describe("community & learning group", () => {
  test("forum categories are whole-card links", async ({ page }) => {
    await gotoPage(page, "/forum");
    const card = page.locator('main a[href*="/forum/"]').filter({ hasNotText: /search/i }).first();
    test.skip((await card.count()) === 0, "no forum categories");
    const box = await card.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThan(60);
    await card.click();
    await expect(page).toHaveURL(/\/forum\/[^/]+/);
  });

  for (const path of ["/missions", "/quotes/technical-rating"]) {
    test(`${path} shows one guest card with a sign-in link`, async ({ page }) => {
      await gotoPage(page, path);
      await expect(
        page.getByRole("main").getByRole("link", { name: /^sign in$/i }),
      ).toHaveAttribute("href", /\/auth\/signin\?callbackUrl=/);
      await expect(page.getByRole("main").getByRole("heading", { level: 2 })).toHaveCount(1);
    });
  }

  for (const path of PAGES) {
    test(`${path} has one h1 and no horizontal scroll`, async ({ page }) => {
      await gotoPage(page, path);
      await expect(page.locator("h1")).toHaveCount(1);
      await expectNoHorizontalScroll(page);
    });
  }
});
