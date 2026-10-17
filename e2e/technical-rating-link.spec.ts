import { expect, test } from "@playwright/test";
import { gotoPage, signIn } from "./helpers";

test("push deep link scrolls to and marks the signal", async ({ page }) => {
  await signIn(page);
  await gotoPage(page, "/quotes/technical-rating");
  const rows = page.locator("li[data-signal-key]");
  const count = await rows.count();
  test.skip(count < 2, "need at least two signals in history");

  // Pick one far down the list so the page must scroll to show it.
  const target = rows.nth(Math.min(count - 1, 15));
  const key = await target.getAttribute("data-signal-key");
  const id = await target.getAttribute("id");

  await gotoPage(page, `/quotes/technical-rating?signal=${encodeURIComponent(key!)}`);
  const marked = page.locator(`#${id}`);
  await expect(marked).toHaveAttribute("aria-current", "true");
  await expect(marked).toBeInViewport();
  await expect(page.locator('li[data-signal-key][aria-current="true"]')).toHaveCount(1);
});

test("unknown signal key leaves the page as normal", async ({ page }) => {
  await signIn(page);
  await gotoPage(page, "/quotes/technical-rating?signal=does-not-exist");
  await expect(page.locator('li[data-signal-key][aria-current="true"]')).toHaveCount(0);
});
