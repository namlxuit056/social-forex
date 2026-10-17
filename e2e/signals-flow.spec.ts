import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll, gotoPage } from "./helpers";

test.describe("signals and copy group", () => {
  test("list → detail → back keeps the filters", async ({ page }) => {
    await gotoPage(page, "/signals?period=all&status=CLOSED_WIN");
    const link = page.locator('#signal-list li a[href*="/signals/"]').first();
    test.skip((await link.count()) === 0, "no closed winning signals");
    await link.click();
    await expect(page).toHaveURL(/\/signals\/[^/?]+$/);
    await expect(page.locator("[data-level]")).toHaveCount(5);
    await page.getByRole("link", { name: /signal list/i }).click();
    await expect(page).toHaveURL(/period=all/);
    await expect(page).toHaveURL(/status=CLOSED_WIN/);
  });

  test("missing price levels read as unset, not as stop/target colours", async ({ page }) => {
    await gotoPage(page, "/signals?period=all");
    const empty = page.locator("[data-level] dd", { hasText: /^—$/ }).first();
    test.skip((await empty.count()) === 0, "every level is filled");
    const color = await empty.evaluate((el) => getComputedStyle(el).color);
    const muted = await page.evaluate(() => {
      const probe = document.createElement("span");
      probe.className = "text-muted-foreground";
      document.body.append(probe);
      const c = getComputedStyle(probe).color;
      probe.remove();
      return c;
    });
    expect(color).toBe(muted);

    // Same in dark mode, where coloured variants used to leak through.
    await page.evaluate(() => document.documentElement.classList.add("dark"));
    const darkColor = await empty.evaluate((el) => getComputedStyle(el).color);
    const darkMuted = await page.evaluate(() => {
      const probe = document.createElement("span");
      probe.className = "text-muted-foreground";
      document.body.append(probe);
      const c = getComputedStyle(probe).color;
      probe.remove();
      return c;
    });
    expect(darkColor).toBe(darkMuted);
  });

  test("leaderboard: one current timeframe, Follow is secondary to Copy", async ({ page }) => {
    await gotoPage(page, "/leaderboard");
    await expect(page.locator('a[aria-current="true"][href*="timeframe="]')).toHaveCount(2);
    await page.getByRole("link", { name: /^30 days$/ }).click();
    await expect(page).toHaveURL(/timeframe=30d|timeframe=30/);

    const follow = page.getByRole("button", { name: /^follow$/i }).filter({ visible: true }).first();
    test.skip((await follow.count()) === 0, "no traders listed");
    await expect(follow).not.toHaveClass(/(^|\s)bg-primary(\s|$)/);
  });

  for (const path of ["/leaderboard", "/copy-trade", "/ai-trade-proposals"]) {
    test(`${path} has no horizontal scroll`, async ({ page }) => {
      await gotoPage(page, path);
      await expectNoHorizontalScroll(page);
    });
  }
});
