import type { NextRequest } from "next/server";
import { syncUnfinishedTradingAgentsRuns } from "@/lib/trading-agents/client";

export const dynamic = "force-dynamic";

/**
 * Syncs every unfinished TradingAgents run (which notifies its users on finish).
 * POSTed by the sidecar the moment a job ends; GET by cron as a backstop for
 * callbacks lost while the web app was down.
 */
function authorized(req: NextRequest) {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return false;
  return [process.env.TRADING_AGENTS_SECRET, process.env.CRON_SECRET, process.env.ADMIN_SECRET].some(
    (secret) => !!secret && secret === token,
  );
}

async function handle(req: NextRequest) {
  if (!authorized(req)) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const finished = await syncUnfinishedTradingAgentsRuns();
  return Response.json({ ok: true, finished });
}

export const GET = handle;
export const POST = handle;
