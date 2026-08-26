import type { NextRequest } from "next/server";
import { checkPriceAlerts } from "@/lib/price-alerts/check";
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
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!(await isCronJobEnabled("price-alerts-check"))) {
    return Response.json({ ok: true, skipped: true, reason: "disabled_by_admin" });
  }

  const result = await checkPriceAlerts();
  return Response.json(result);
}
