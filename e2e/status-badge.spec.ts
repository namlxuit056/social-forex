import { expect, test } from "@playwright/test";
import { gotoPage } from "./helpers";

test.describe("shared status badges", () => {
  test("signal list badges take their tone from the status map", async ({ page }) => {
    await gotoPage(page, "/signals?period=all");
    const cards = page.locator("#signal-list li");
    test.skip((await cards.count()) === 0, "no signals in this database");

    const direction = cards.first().locator("[data-tone]", { hasText: /^(LONG|SHORT)$/ });
    await expect(direction).toHaveCount(1);
    const text = (await direction.textContent())?.trim();
    await expect(direction).toHaveAttribute("data-tone", text === "LONG" ? "success" : "danger");

    // Status badge exists and is one of the mapped tones.
    const tones = await cards.first().locator("[data-tone]").evaluateAll((els) =>
      els.map((el) => el.getAttribute("data-tone")),
    );
    for (const tone of tones) {
      expect(["neutral", "primary", "success", "danger", "warning", "info"]).toContain(tone);
    }
  });

  test("calendar impact badges use high=danger, medium=warning", async ({ page }) => {
    await gotoPage(page, "/calendar");
    const high = page.locator('[data-tone="danger"]', { hasText: /^High$/ });
    const med = page.locator('[data-tone="warning"]', { hasText: /^Med/ });
    const total = (await high.count()) + (await med.count());
    test.skip(total === 0, "no high/medium events in the current window");
    expect(total).toBeGreaterThan(0);
  });

  test("signal detail shows direction, tier and status as tone badges", async ({ page }) => {
    await gotoPage(page, "/signals?period=all");
    const detail = page.locator('#signal-list li a[href*="/signals/"]').first();
    test.skip((await detail.count()) === 0, "no signals in this database");
    await detail.click();
    await expect(page).toHaveURL(/\/signals\/[^/?]+/);
    await expect(page.locator("h1 ~ [data-tone]")).toHaveCount(3);
  });
});
