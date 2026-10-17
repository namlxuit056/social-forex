import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll, gotoPage } from "./helpers";

test.describe("account group", () => {
  test("sign-in page: logo, one title, plain card", async ({ page }) => {
    await gotoPage(page, "/auth/signin");
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("main .blur-3xl")).toHaveCount(0);
    await expectNoHorizontalScroll(page);
  });

  test("wrong credentials show an inline error next to the form", async ({ page }) => {
    await gotoPage(page, "/auth/signin");
    await page.getByLabel(/email/i).fill("nobody-e2e@example.invalid");
    await page.getByLabel(/password/i).fill("definitely-wrong-password");
    await page.getByRole("main").getByRole("button", { name: /sign in/i }).click();
    const alert = page.getByRole("alert").filter({ hasText: /incorrect|too many/i });
    await expect(alert).toBeVisible();
    await expect(page.getByLabel(/email/i)).toHaveAttribute("aria-invalid", "true");
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test("register page links back to sign in", async ({ page }) => {
    await gotoPage(page, "/auth/register");
    await expect(page.locator("h1")).toHaveCount(1);
    await page.getByRole("main").getByRole("link", { name: /^sign in$/i }).click();
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  for (const path of ["/profile", "/upgrade-vip"]) {
    test(`${path} guest view offers sign in and sign up`, async ({ page }) => {
      await gotoPage(page, path);
      const main = page.getByRole("main");
      await expect(main.getByRole("link", { name: /^sign in$/i })).toBeVisible();
      await expect(main.getByRole("link", { name: /^sign up$/i })).toBeVisible();
      await expectNoHorizontalScroll(page);
    });
  }
});
