import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll, gotoPage } from "./helpers";

test.describe("trading desk group", () => {
  test("desk market picker drives the chart through ?symbol=", async ({ page }) => {
    await gotoPage(page, "/desk");
    const market = page.locator("#desk-symbol").filter({ visible: true });
    await market.click();
    await page.getByRole("option", { name: /^EURUSD/ }).click();
    await expect(page).toHaveURL(/symbol=EURUSD/);
    await expect(page.locator('iframe[title="TradingView — EURUSD"]')).toHaveCount(1);
  });

  test("desk opened with ?symbol= preselects that market", async ({ page }) => {
    await gotoPage(page, "/desk?symbol=GBPUSD");
    await expect(page.locator("#desk-symbol").filter({ visible: true })).toContainText("GBPUSD");
    await expect(page.locator('iframe[title="TradingView — GBPUSD"]')).toHaveCount(1);
  });

  test("calendar filters are neutral toggle chips and a timezone switch", async ({ page }) => {
    await gotoPage(page, "/calendar");
    const high = page.getByRole("button", { name: /^High$/ });
    await expect(high).toHaveAttribute("aria-pressed", "true");
    await high.click();
    await expect(high).toHaveAttribute("aria-pressed", "false");

    const utc = page.getByRole("radio", { name: "UTC" });
    await utc.click();
    await expect(utc).toHaveAttribute("aria-checked", "true");
    await expect(page.getByText(/^UTC$|Coordinated|UTC \(/).first()).toBeVisible();
  });

  test("quotes explain the AI sign-in once instead of on every row", async ({ page }) => {
    await gotoPage(page, "/quotes");
    await expect(page.getByText("EURUSD", { exact: true }).filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText("Sign in to run AI day view.", { exact: true })).toHaveCount(1);
  });

  for (const path of ["/chart", "/quotes", "/calendar", "/desk"]) {
    test(`${path} has no horizontal scroll`, async ({ page }) => {
      await gotoPage(page, path);
      await expectNoHorizontalScroll(page);
    });
  }
});
