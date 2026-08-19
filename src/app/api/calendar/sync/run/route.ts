import type { NextRequest } from "next/server";
import { resolveCalendarEvents } from "@/lib/calendar/resolve-calendar";

export const dynamic = "force-dynamic";

function authorized(req: NextRequest) {
  // CRON_SECRET: auto-injected by Vercel on cron invocations
  // ADMIN_SECRET: manual triggers and external scripts
  const expected = process.env.CRON_SECRET || process.env.ADMIN_SECRET;
  if (!expected) return false;
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return token === expected || req.nextUrl.searchParams.get("secret") === expected;
}

async function run() {
  const result = await resolveCalendarEvents();
  return Response.json({
    ok: true,
    source: result.source,
    syncedAt: result.syncedAt,
    warning: result.warning,
    count: result.events.length,
  });
}

// Vercel Cron calls GET — keep POST for manual/external triggers
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
