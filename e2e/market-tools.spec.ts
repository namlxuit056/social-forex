import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll, gotoPage } from "./helpers";

test.describe("market tools group", () => {
  test("sentiment long and short always add up to 100%", async ({ page }) => {
    await gotoPage(page, "/sentiment");
    const longs = await page.getByText(/^Long \d+%$/).allTextContents();
    const shorts = await page.getByText(/^Short \d+%$/).allTextContents();
    test.skip(longs.length === 0, "no active signals");
    expect(shorts.length).toBe(longs.length);
    longs.forEach((l, i) => {
      const sum = Number(l.match(/\d+/)![0]) + Number(shorts[i].match(/\d+/)![0]);
      expect(sum).toBe(100);
    });
  });

  test("screener ratings use the shared tone badges", async ({ page }) => {
    await gotoPage(page, "/screener");
    const buy = page.locator('[data-tone="success"]', { hasText: /BUY/ }).first();
    const sell = page.locator('[data-tone="danger"]', { hasText: /SELL/ }).first();
    await expect(buy.or(sell).first()).toBeVisible();
  });

  for (const path of ["/screener", "/scalping", "/heatmap", "/sentiment", "/tools"]) {
    test(`${path} renders a page title without horizontal scroll`, async ({ page }) => {
      await gotoPage(page, path);
      await expect(page.locator("h1")).toHaveCount(1);
      await expectNoHorizontalScroll(page);
    });
  }
});
