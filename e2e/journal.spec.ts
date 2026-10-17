import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll, gotoPage, signIn } from "./helpers";

test.describe("journal & discipline group", () => {
  for (const path of ["/journal", "/plan"]) {
    test(`${path} shows one sign-up card with a sign-in link to guests`, async ({ page }) => {
      await gotoPage(page, path);
      await expect(page.getByRole("heading", { level: 2 })).toHaveCount(1);
      const signInLink = page.getByRole("main").getByRole("link", { name: /^sign in$/i });
      await expect(signInLink).toHaveAttribute("href", /\/auth\/signin\?callbackUrl=/);
      await expectNoHorizontalScroll(page);
    });
  }

  test("backtest redraws the equity line when inputs change", async ({ page }) => {
    await gotoPage(page, "/backtest");
    const line = page.locator("svg polyline");
    await expect(line).toHaveCount(1);
    const before = await line.getAttribute("points");
    const winRate = page.getByLabel(/win rate/i);
    await winRate.fill("70");
    await expect.poll(() => line.getAttribute("points")).not.toBe(before);
    await expect(page.getByText(/max drawdown/i)).toBeVisible();
    await expectNoHorizontalScroll(page);
  });

  test("signed-in journal: all tabs open without horizontal scroll", async ({ page }) => {
    await signIn(page);
    for (const tab of ["", "weekly", "daily", "edge", "stats", "chat", "emotion", "lessons"]) {
      await gotoPage(page, tab ? `/journal?tab=${tab}` : "/journal");
      await expect(page.locator('nav[aria-label] [aria-current="page"]').first()).toBeVisible();
      await expectNoHorizontalScroll(page);
    }
  });
});
