import type { NextRequest } from "next/server";
import { runDailyRatingSummary } from "@/lib/quotes/run-daily-rating-summary";
import { isCronJobEnabled } from "@/lib/cron/job-enabled";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function authorized(req: NextRequest) {
  const expected = process.env.CRON_SECRET || process.env.ADMIN_SECRET;
  if (!expected) return false;
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return token === expected || req.nextUrl.searchParams.get("secret") === expected;
}

async function run() {
  if (!(await isCronJobEnabled("tv-rating-daily-summary"))) {
    return Response.json({ ok: true, skipped: true, reason: "disabled_by_admin" });
  }

  const result = await runDailyRatingSummary();
  return Response.json(result);
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  return run();
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  return run();
}
