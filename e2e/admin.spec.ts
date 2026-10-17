import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll, gotoPage, localized, signIn } from "./helpers";

const ADMIN_PAGES = [
  "/admin",
  "/admin/academy",
  "/admin/ai-settings",
  "/admin/analytics",
  "/admin/articles",
  "/admin/crons",
  "/admin/crons/lot-sizes",
  "/admin/reports",
  "/admin/scalping-calibration",
  "/admin/signals",
  "/admin/telegram-signals",
  "/admin/users",
  "/admin/vip",
];

test.describe("admin", () => {
  for (const path of ADMIN_PAGES) {
    test(`${path} sends anonymous visitors to sign in`, async ({ page }) => {
      await page.goto(localized(path));
      await expect(page).toHaveURL(/\/auth\/signin/);
    });
  }

  test("admin pages render a title without horizontal scroll", async ({ page }) => {
    test.setTimeout(180_000);
    await signIn(page, "ADMIN");
    for (const path of ADMIN_PAGES) {
      await gotoPage(page, path);
      await expect(page.locator("h1").first(), path).toBeVisible();
      await expectNoHorizontalScroll(page);
    }
  });
});
