#!/usr/bin/env node
// Self-hosted replacement for Vercel Cron.
// Reads the schedule list from vercel.json (single source of truth) and calls
// each route on the local Next.js server with `Authorization: Bearer <secret>`,
// exactly like Vercel does. Schedules are evaluated in UTC (Vercel semantics).
//
// Disabled unless SELFHOST_CRON_ENABLED=1 — while Vercel is still live its crons
// fire too, and running both would double-post screener/scalping signals.

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
if (existsSync(resolve(root, ".env"))) process.loadEnvFile(resolve(root, ".env"));

const BASE_URL = process.env.SELFHOST_CRON_BASE_URL || "http://127.0.0.1:3000";
const TIMEOUT_MS = 10 * 60 * 1000;

// Mirrors the secret precedence of each route's authorized() check.
function secretFor(path) {
  const common = process.env.CRON_SECRET || process.env.ADMIN_SECRET;
  if (path === "/api/ai/articles/run") return process.env.AI_ARTICLE_CRON_SECRET || common;
  if (path === "/api/mt5/reconcile-signals/run") return process.env.MT5_RECONCILE_CRON_SECRET || common;
  return common;
}

// Minimal 5-field cron matcher: supports *, */n, a-b, a-b/n, and comma lists.
function fieldMatches(expr, value, min, max) {
  return expr.split(",").some((part) => {
    const [range, stepRaw] = part.split("/");
    const step = stepRaw ? Number(stepRaw) : 1;
    let lo = min;
    let hi = max;
    if (range !== "*") {
      const [a, b] = range.split("-").map(Number);
      lo = a;
      hi = b ?? (stepRaw ? max : a);
    }
    return value >= lo && value <= hi && (value - lo) % step === 0;
  });
}

function cronMatches(schedule, d) {
  const [m, h, dom, mon, dow] = schedule.trim().split(/\s+/);
  const domOk = fieldMatches(dom, d.getUTCDate(), 1, 31);
  const dowOk = fieldMatches(dow, d.getUTCDay(), 0, 6) || (d.getUTCDay() === 0 && fieldMatches(dow, 7, 0, 7));
  // Standard cron: if both day fields are restricted, either may match.
  const dayOk = dom !== "*" && dow !== "*" ? domOk || dowOk : domOk && dowOk;
  return (
    fieldMatches(m, d.getUTCMinutes(), 0, 59) &&
    fieldMatches(h, d.getUTCHours(), 0, 23) &&
    fieldMatches(mon, d.getUTCMonth() + 1, 1, 12) &&
    dayOk
  );
}

function loadJobs() {
  const { crons = [] } = JSON.parse(readFileSync(resolve(root, "vercel.json"), "utf8"));
  return crons;
}

const running = new Set();

async function fire(path) {
  if (running.has(path)) {
    console.log(`[cron] skip ${path} — previous run still in progress`);
    return;
  }
  const secret = secretFor(path);
  if (!secret) {
    console.error(`[cron] no secret configured for ${path}`);
    return;
  }
  running.add(path);
  const started = Date.now();
  try {
    const res = await fetch(BASE_URL + path, {
      headers: { authorization: `Bearer ${secret}`, "user-agent": "selfhost-cron/1.0" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const body = (await res.text()).slice(0, 300).replace(/\s+/g, " ");
    console.log(`[cron] ${path} → ${res.status} in ${Date.now() - started}ms ${body}`);
  } catch (err) {
    console.error(`[cron] ${path} failed after ${Date.now() - started}ms:`, err?.message ?? err);
  } finally {
    running.delete(path);
  }
}

function tick() {
  const now = new Date();
  now.setUTCSeconds(0, 0);
  // Re-read each minute so edits to vercel.json apply without a restart.
  for (const { path, schedule } of loadJobs()) {
    if (cronMatches(schedule, now)) void fire(path);
  }
}

function scheduleNextTick() {
  const msToNextMinute = 60_000 - (Date.now() % 60_000) + 500;
  setTimeout(() => {
    tick();
    scheduleNextTick();
  }, msToNextMinute);
}

const [, , cmd, arg] = process.argv;

if (cmd === "run") {
  // Manual one-off: node scripts/selfhost/cron-runner.mjs run /api/calendar/sync/run
  await fire(arg);
} else if (cmd === "list") {
  for (const { path, schedule } of loadJobs()) console.log(`${schedule.padEnd(18)} ${path}`);
} else if (process.env.SELFHOST_CRON_ENABLED !== "1") {
  console.log("[cron] SELFHOST_CRON_ENABLED != 1 — scheduler idle (Vercel crons still own the schedule).");
  // Stay alive so pm2 doesn't restart-loop; re-check the flag isn't needed until restart.
  setInterval(() => {}, 1 << 30);
} else {
  console.log(`[cron] scheduler started, ${loadJobs().length} jobs, target ${BASE_URL} (UTC schedules)`);
  scheduleNextTick();
}
