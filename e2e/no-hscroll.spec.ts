import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll, gotoPage, signIn } from "./helpers";

// Every static route; signed-in pages are checked again after login below.
const PUBLIC = [
  "/", "/academy", "/ai-trade-proposals", "/articles", "/auth/register", "/auth/signin",
  "/backtest", "/brokers", "/calendar", "/challenge", "/chart", "/copy-trade", "/desk",
  "/forum", "/forum/search", "/heatmap", "/journal", "/leaderboard", "/missions",
  "/partners", "/plan", "/profile", "/quotes", "/quotes/technical-rating", "/resources",
  "/scalping", "/screener", "/sentiment", "/signals", "/start", "/tools", "/upgrade-vip",
  "/webinar",
];

const SIGNED_IN = [
  "/dashboard", "/journal", "/journal/report", "/plan", "/alerts", "/messages", "/mt5",
  "/notifications", "/positions", "/profile", "/missions", "/scalping", "/screener",
  "/ai-trade-proposals", "/quotes/technical-rating", "/upgrade-vip",
];

for (const path of PUBLIC) {
  test(`guest ${path} has no horizontal scroll`, async ({ page }) => {
    await gotoPage(page, path);
    await expectNoHorizontalScroll(page);
  });
}

test("signed-in pages have no horizontal scroll", async ({ page }) => {
  test.setTimeout(300_000);
  await signIn(page);
  const failures: string[] = [];
  for (const path of SIGNED_IN) {
    await gotoPage(page, path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    if (overflow > 1) failures.push(`${path} (+${overflow}px)`);
  }
  expect(failures, "pages that scroll sideways").toEqual([]);
});
