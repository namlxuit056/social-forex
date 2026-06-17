import type { NextRequest } from "next/server";
import { runAiArticleAutomation } from "@/lib/ai/article-writer";

export const dynamic = "force-dynamic";

function authorized(req: NextRequest) {
  // CRON_SECRET: auto-injected by Vercel on cron invocations
  // AI_ARTICLE_CRON_SECRET / ADMIN_SECRET: manual triggers and external scripts
  const expected =
    process.env.AI_ARTICLE_CRON_SECRET ||
    process.env.CRON_SECRET ||
    process.env.ADMIN_SECRET;
  if (!expected) return false;
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return token === expected || req.nextUrl.searchParams.get("secret") === expected;
}

// Vercel Cron calls GET — keep POST for manual/external triggers
export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const result = await runAiArticleAutomation();
  return Response.json(result);
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const result = await runAiArticleAutomation();
  return Response.json(result);
}
