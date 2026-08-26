import type { NextRequest } from "next/server";
import { runScreenerAutoFire } from "@/lib/signals/screener-auto-fire";
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

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!(await isCronJobEnabled("screener-auto-run"))) {
    return Response.json({ ok: true, skipped: true, reason: "disabled_by_admin" });
  }

  const result = await runScreenerAutoFire();
  return Response.json(result, { status: result.ok ? 200 : 500 });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
