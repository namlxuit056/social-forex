import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll, gotoPage, signIn } from "./helpers";

test.describe("shared blocks", () => {
  test("signals list uses FilterBar and PriceLevels", async ({ page }) => {
    await gotoPage(page, "/signals?period=all");
    await expect(page.locator('[data-slot="filter-bar"]')).toHaveCount(1);
    const card = page.locator("#signal-list li").first();
    test.skip((await card.count()) === 0, "no signals in this database");
    const levels = card.locator("[data-level]");
    // Masked VIP cards show a teaser instead of levels.
    if ((await levels.count()) > 0) {
      await expect(levels).toHaveCount(5);
      await expect(card.locator('[data-level="entry"]')).toContainText(/entry/i);
    }
  });

  test("journal tabs and KPI cards", async ({ page }) => {
    await signIn(page);
    await gotoPage(page, "/journal");
    const tabs = page.getByRole("navigation", { name: /journal sections/i });
    await expect(tabs.getByRole("link")).toHaveCount(8);
    await expect(tabs.locator('[aria-current="page"]')).toHaveCount(1);
    await expect(page.locator('[data-slot="stat-card"]')).toHaveCount(6);

    await tabs.getByRole("link", { name: /stats/i }).click();
    await expect(page).toHaveURL(/tab=stats/);
    await expect(tabs.locator('[aria-current="page"]')).toHaveText(/stats/i);
    await expectNoHorizontalScroll(page);
  });
});
