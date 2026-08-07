import { prisma } from "@/lib/prisma";
import { getScreenerAiPicks } from "@/lib/ai/screener-picks";
import { createScreenerSignal, SCREENER_AUTO_TIMEFRAME } from "@/lib/signals/create-screener-signal";

// Fixed for every user — this cron posts under one shared bot account, not a per-user config.
export const SCREENER_AUTO_FIRE_MIN_SCORE = 70;

// Skip a symbol if the bot already posted a still-open pick for it recently, so three
// runs a day don't spam followers with near-duplicate entries when a setup persists.
const DEDUPE_WINDOW_MS = 6 * 60 * 60 * 1000;

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

export type ScreenerAutoFireResult = {
  symbol: string;
  status: "fired" | "skipped";
  reason?: string;
  qualityScore?: number;
  signalId?: string;
};

export type ScreenerAutoFireSummary =
  | { ok: true; scanned: number; fired: number; results: ScreenerAutoFireResult[] }
  | { ok: false; error: string };

/** Scans the current /screener AI picks and auto-posts any with qualityScore >= 70
 * under the shared bot account (SCREENER_BOT_USER_EMAIL). Shared by the 3x/day cron
 * (/api/screener/auto-run) and the manual "Run now" trigger in /admin/crons. */
export async function runScreenerAutoFire(): Promise<ScreenerAutoFireSummary> {
  const bot = await resolveBotUserId();
  if ("error" in bot) {
    return { ok: false, error: bot.error };
  }

  const { picks } = await getScreenerAiPicks("vi");

  const results: ScreenerAutoFireResult[] = [];
  for (const pick of picks) {
    if (pick.qualityScore < SCREENER_AUTO_FIRE_MIN_SCORE) {
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
  return { ok: true, scanned: picks.length, fired, results };
}
