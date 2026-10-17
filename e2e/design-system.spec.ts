import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll, gotoPage, localized, signIn } from "./helpers";

test.describe("/admin/design-system", () => {
  test("is hidden from anonymous visitors", async ({ page }) => {
    const res = await page.goto(localized("/admin/design-system"));
    expect(res?.status()).toBe(404);
  });

  test("admins see every section and both themes", async ({ page }) => {
    await signIn(page, "ADMIN");
    await gotoPage(page, "/admin/design-system");
    for (const id of ["ds-colors", "ds-type", "ds-buttons", "ds-badges", "ds-inputs", "ds-blocks", "ds-states"]) {
      await expect(page.locator(`[data-ds-section="${id}"]`)).toBeVisible();
    }
    await expect(page.locator("[data-ds-section=ds-colors] .dark")).toHaveCount(1);
    await expect(page.locator('[data-tone="danger"]').first()).toBeVisible();

    await page.locator("#ds-select").click();
    await page.getByRole("option", { name: /any date/i }).click();
    await expect(page.locator("#ds-select")).toContainText(/any date/i);
    await expectNoHorizontalScroll(page);
  });
});
