import { expect, test } from "@playwright/test";
import { gotoPage } from "./helpers";

// App screens share one title size; only the home hero is larger.
const APP_PAGES = ["/desk", "/signals", "/quotes", "/calendar", "/leaderboard", "/tools"];

for (const path of APP_PAGES) {
  test(`${path} uses the standard page title size`, async ({ page }) => {
    await gotoPage(page, path);
    const h1 = page.locator("h1");
    await expect(h1).toHaveCount(1);
    await expect(h1.first()).toHaveCSS("font-size", "20px");
  });
}

test("status tokens resolve in both themes", async ({ page }) => {
  await gotoPage(page, "/");
  const read = () =>
    page.evaluate(() => {
      const cs = getComputedStyle(document.documentElement);
      return ["--success", "--danger", "--warning", "--info", "--border-strong"].map(
        (name) => cs.getPropertyValue(name).trim(),
      );
    });
  const light = await read();
  expect(light.every(Boolean)).toBe(true);
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  const dark = await read();
  expect(dark.every(Boolean)).toBe(true);
  expect(dark).not.toEqual(light);
});
