import type { NextRequest } from "next/server";
import { runScreenerAutoFire } from "@/lib/signals/screener-auto-fire";

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

  const result = await runScreenerAutoFire();
  return Response.json(result, { status: result.ok ? 200 : 500 });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
