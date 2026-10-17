import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll, gotoPage, isMobile } from "./helpers";

const PAGES = ["/", "/desk", "/signals", "/quotes", "/calendar"];

test.describe("app shell", () => {
  test("header shows brand and primary navigation", async ({ page }) => {
    await gotoPage(page, "/");
    const header = page.locator("header").first();
    await expect(header.getByRole("link", { name: /socialforex/i })).toBeVisible();
    const nav = isMobile(page)
      ? header.getByRole("navigation").last()
      : header.getByRole("navigation").first();
    await expect(nav.getByRole("link", { name: /signals/i })).toBeVisible();
  });

  test("primary nav marks the current page", async ({ page }) => {
    await gotoPage(page, "/");
    const header = page.locator("header").first();
    await header.getByRole("link", { name: /^signals$/i }).filter({ visible: true }).first().click();
    await expect(page).toHaveURL(/\/signals/);
    await expect(
      header.locator('a[aria-current="page"]').filter({ visible: true }).first(),
    ).toHaveText(/signals/i);
  });

  for (const path of PAGES) {
    test(`${path} renders one h1 without horizontal scroll`, async ({ page }) => {
      await gotoPage(page, path);
      await expect(page.locator("h1")).toHaveCount(1);
      await expectNoHorizontalScroll(page);
    });
  }
});
