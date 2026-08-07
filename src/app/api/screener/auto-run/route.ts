import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getScreenerAiPicks } from "@/lib/ai/screener-picks";
import { createScreenerSignal, SCREENER_AUTO_TIMEFRAME } from "@/lib/signals/create-screener-signal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Fixed for every user — this cron posts under one shared bot account, not a per-user config.
const AUTO_FIRE_MIN_SCORE = 70;

// Skip a symbol if the bot already posted a still-open pick for it recently, so three
// runs a day don't spam followers with near-duplicate entries when a setup persists.
const DEDUPE_WINDOW_MS = 6 * 60 * 60 * 1000;

function authorized(req: NextRequest) {
  const expected = process.env.CRON_SECRET || process.env.ADMIN_SECRET;
  if (!expected) return false;
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return token === expected || req.nextUrl.searchParams.get("secret") === expected;
}

async function resolveBotUserId(): Promise<{ userId: string } | { error: string }> {
  const email = process.env.SCREENER_BOT_USER_EMAIL;
  if (!email) return { error: "SCREENER_BOT_USER_EMAIL not configured" };

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!user) return { error: `SCREENER_BOT_USER_EMAIL user not found: ${email}` };

  return { userId: user.id };
}

type RunResult = {
  symbol: string;
  status: "fired" | "skipped";
  reason?: string;
  qualityScore?: number;
  signalId?: string;
};

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const bot = await resolveBotUserId();
  if ("error" in bot) {
    return Response.json({ ok: false, error: bot.error }, { status: 500 });
  }

  const { picks } = await getScreenerAiPicks("vi");

  const results: RunResult[] = [];
  for (const pick of picks) {
    if (pick.qualityScore < AUTO_FIRE_MIN_SCORE) {
      results.push({ symbol: pick.symbol, status: "skipped", reason: `low_score_${pick.qualityScore}` });
      continue;
    }

    const recent = await prisma.signal.findFirst({
      where: {
        authorId: bot.userId,
        symbol: pick.symbol.toUpperCase(),
        status: { in: ["ACTIVE", "PENDING"] },
        createdAt: { gte: new Date(Date.now() - DEDUPE_WINDOW_MS) },
      },
      select: { id: true },
    });
    if (recent) {
      results.push({ symbol: pick.symbol, status: "skipped", reason: "duplicate_open_signal" });
      continue;
    }

    const { signalId } = await createScreenerSignal(
      bot.userId,
      {
        symbol: pick.symbol,
        direction: pick.direction,
        entry: pick.entry,
        stopLoss: pick.stopLoss,
        takeProfit: pick.takeProfit,
        confidence: pick.confidence,
        qualityScore: pick.qualityScore,
        reasoning: pick.reasoning,
        checklist: pick.checklist,
      },
      SCREENER_AUTO_TIMEFRAME,
    );

    results.push({ symbol: pick.symbol, status: "fired", qualityScore: pick.qualityScore, signalId });
  }

  const fired = results.filter((r) => r.status === "fired").length;
  return Response.json({ ok: true, scanned: picks.length, fired, results });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
