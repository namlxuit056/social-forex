import { expect, test } from "@playwright/test";
import { gotoPage } from "./helpers";

test.describe("custom form controls", () => {
  test("signal filters use the app dropdown, not the native select", async ({ page }) => {
    await gotoPage(page, "/signals?period=all");
    await expect(page.locator("#signal-filter-status").filter({ visible: true })).toBeVisible();
    await expect(page.locator("select:visible")).toHaveCount(0);
  });

  test("picking a status with the mouse updates the URL", async ({ page }) => {
    await gotoPage(page, "/signals?period=all");
    await page.locator("#signal-filter-status").filter({ visible: true }).click();
    await page.getByRole("option", { name: /closed.*(tp|win)/i }).click();
    await expect(page).toHaveURL(/status=CLOSED_WIN/);
    await expect(page.locator("#signal-filter-status").filter({ visible: true })).toContainText(/closed/i);
  });

  test("the period dropdown works from the keyboard", async ({ page }) => {
    await gotoPage(page, "/signals");
    const trigger = page.locator("#signal-filter-period").filter({ visible: true });
    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("listbox")).toBeVisible();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/period=week/);
  });

  test("desk market picker and discipline checklist", async ({ page }) => {
    await gotoPage(page, "/desk");
    await expect(page.locator("select:visible")).toHaveCount(0);

    await page.locator("#desk-symbol").filter({ visible: true }).click();
    await page.getByRole("option", { name: /^EURUSD/ }).click();
    await expect(page.locator("#desk-symbol").filter({ visible: true })).toContainText("EURUSD");

    const progress = page.getByText(/\d\/5 checks complete/i);
    await expect(progress).toHaveText(/0\/5/);
    await page.getByRole("checkbox").first().click();
    await expect(progress).toHaveText(/1\/5/);
  });
});
