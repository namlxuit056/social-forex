import { expect, type Page, test } from "@playwright/test";

const GOLD_AI_POPUP_KEY = "social-forex:gold-ai-popup:v1";

/** Dismiss one-off onboarding popups so they don't cover the page under test. */
export async function dismissPopups(page: Page) {
  await page.addInitScript((key) => {
    try {
      window.localStorage.setItem(key, "dismissed");
    } catch {
      /* storage may be blocked */
    }
  }, GOLD_AI_POPUP_KEY);
}

/** Tests assert English copy, so every path is opened under the /en locale. */
export const LOCALE_PREFIX = "/en";

export function localized(path: string) {
  return path === "/" ? LOCALE_PREFIX : `${LOCALE_PREFIX}${path}`;
}

export async function gotoPage(page: Page, path: string) {
  await dismissPopups(page);
  // Not "load": pages with many remote images (academy) can stall it for 30s+.
  await page.goto(localized(path), { waitUntil: "domcontentloaded" });
  await waitForHydration(page);
}

/**
 * Next streams the HTML before React hydrates; asserting during that window
 * can see half-swapped trees or click buttons that have no handlers yet.
 */
export async function waitForHydration(page: Page) {
  await page
    .waitForFunction(() => {
      // Suspense boundaries hydrate separately, so check every control in
      // <main>, not just the root: React tags hydrated nodes with __reactFiber*.
      const hydrated = (el: Element) =>
        Object.keys(el).some((key) => key.startsWith("__reactFiber"));
      const root = document.querySelector("main");
      if (!root || !hydrated(root)) return false;
      return [...root.querySelectorAll("button, [role=combobox], input")].every(hydrated);
    }, null, { timeout: 15_000 })
    .catch(() => {});
}

export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow, "page should not scroll horizontally").toBeLessThanOrEqual(1);
}

export function isMobile(page: Page) {
  return (page.viewportSize()?.width ?? 1280) < 1024;
}

/** Sign in with E2E_USER_* creds, skipping the test when they aren't configured. */
export async function signIn(
  page: Page,
  kind: "USER" | "ADMIN" = "USER",
) {
  const email = process.env[`E2E_${kind}_EMAIL`];
  const password = process.env[`E2E_${kind}_PASSWORD`];
  test.skip(!email || !password, `E2E_${kind}_EMAIL / E2E_${kind}_PASSWORD not set`);
  await gotoPage(page, "/auth/signin");
  await page.getByLabel(/email/i).fill(email!);
  await page.getByLabel(/password|mật khẩu/i).fill(password!);
  await page.getByRole("button", { name: /sign in|đăng nhập/i }).first().click();
  await page.waitForURL((url) => !url.pathname.includes("/auth/signin"));
}
