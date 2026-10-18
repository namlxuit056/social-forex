// Captures README screenshots of public pages: `node scripts/screenshots.mjs [baseURL]`.
import { existsSync } from "node:fs";
import { chromium } from "@playwright/test";

// Signed-in pages use E2E_USER_* from the gitignored .env.e2e; skipped when absent.
if (existsSync(".env.e2e")) process.loadEnvFile(".env.e2e");
const only = process.argv[3]?.split(",");

const base = process.argv[2] ?? "http://localhost:3000";
// [file, path, options] — options: dark, mobile, click (button name to press first).
const pages = [
  ["home", "/en"],
  ["home-dark", "/en", { dark: true }],
  ["home-mobile", "/en", { mobile: true }],
  ["signals", "/en/signals"],
  ["quotes", "/en/quotes"],
  ["calendar", "/en/calendar", { click: "This week" }],
  ["heatmap", "/en/heatmap"],
  ["screener", "/en/screener"],
  ["sentiment", "/en/sentiment"],
  ["leaderboard", "/en/leaderboard"],
  ["copy-trade", "/en/copy-trade"],
  ["academy", "/en/academy"],
  ["articles", "/en/articles"],
  ["tools", "/en/tools"],
  ["backtest", "/en/backtest"],
  ["chart", "/en/chart"],
  ["technical-rating", "/en/quotes/technical-rating", { auth: true }],
  ["dashboard", "/en/dashboard", { auth: true }],
  ["journal", "/en/journal", { auth: true }],
  ["journal-stats", "/en/journal?tab=stats", { auth: true }],
  ["plan", "/en/plan", { auth: true }],
  ["missions", "/en/missions", { auth: true }],
  ["alerts", "/en/alerts", { auth: true }],
  ["positions", "/en/positions", { auth: true }],
  ["scalping", "/en/scalping", { auth: true }],
  ["desk", "/en/desk", { auth: true }],
];

// Blur account-specific values (balances, P/L, MT5 tickets, referral links) so
// screenshots of a real account are safe to publish.
function blurPrivate() {
  const money = /(\$\s?-?[\d,.]+|[\d,.]+\s?USD|^\s*\d{8,}\s*$|ref=|^\s*[+-][\d,.]+\s*$)/;
  for (const el of document.querySelectorAll("main *")) {
    const text = el.children.length === 0 ? el.textContent : "";
    const value = el instanceof HTMLInputElement ? el.value : "";
    if (money.test(text) || money.test(value)) el.style.filter = "blur(7px)";
  }
}

async function signIn(ctx) {
  const page = await ctx.newPage();
  await page.goto(base + "/en/auth/signin", { waitUntil: "domcontentloaded" });
  await page.getByLabel(/email/i).fill(process.env.E2E_USER_EMAIL);
  await page.getByLabel(/password/i).fill(process.env.E2E_USER_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).first().click();
  await page.waitForURL((url) => !url.pathname.includes("/auth/signin"), { timeout: 30_000 });
  await page.close();
}

const browser = await chromium.launch();
for (const [name, path, opts = {}] of pages) {
  if (only && !only.includes(name)) continue;
  if (opts.auth && !process.env.E2E_USER_EMAIL) continue;
  const ctx = await browser.newContext({
    viewport: opts.mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    deviceScaleFactor: opts.mobile ? 2 : 1,
    isMobile: !!opts.mobile,
    locale: "en-US",
    colorScheme: opts.dark ? "dark" : "light",
  });
  await ctx.addInitScript((dark) => {
    try {
      localStorage.setItem("social-forex:gold-ai-popup:v1", "dismissed");
      localStorage.setItem("theme", dark ? "dark" : "light"); // next-themes key
    } catch {}
  }, !!opts.dark);
  const page = await ctx.newPage();
  try {
    if (opts.auth) await signIn(ctx);
    const res = await page.goto(base + path, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    if (opts.click) await page.getByText(opts.click, { exact: true }).first().click().catch(() => {});
    await page.waitForTimeout(2500);
    if (opts.auth) await page.evaluate(blurPrivate);
    await page.screenshot({ path: `docs/screenshots/${name}.png` });
    console.log(name, res?.status(), page.url());
  } catch (e) {
    console.log(name, "FAILED", e.message.split("\n")[0]);
  }
  await ctx.close();
}
await browser.close();
