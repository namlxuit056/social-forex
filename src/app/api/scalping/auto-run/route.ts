import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { isVipActive } from "@/lib/vip";
import { resolveQuotes } from "@/lib/quotes/resolve-quotes";
import { QUOTE_DEFINITIONS } from "@/lib/quotes/definitions";
import { getScalpingTechnicalContext } from "@/lib/ai/scalping-tradingview-context";
import { getScalpingAiSuggestion } from "@/lib/ai/scalping-suggest";
import { notifyTelegramNewSignal } from "@/lib/telegram";
import { notifySignalSubscribers } from "@/lib/signals/notify-on-signal-create";
import { Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const COOLDOWN_MS = 30 * 60 * 1000; // 30 phút giữa các lệnh

function authorized(req: NextRequest) {
  const expected = process.env.CRON_SECRET || process.env.ADMIN_SECRET;
  if (!expected) return false;
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return token === expected || req.nextUrl.searchParams.get("secret") === expected;
}

function startOfDayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

type RunResult = {
  userId: string;
  symbol: string;
  status: "traded" | "skipped" | "failed";
  reason?: string;
  signalId?: string;
  qualityScore?: number;
  confidence?: number;
  direction?: string;
};

async function runAutoScalp(userId: string, config: {
  symbol: string;
  lotSize: number;
  minScore: number;
  minConfidence: number;
  maxPerDay: number;
  lastTradeAt: Date | null;
  vipUntil: Date | null;
}): Promise<RunResult> {
  const base = { userId, symbol: config.symbol };

  if (!isVipActive(config.vipUntil)) {
    return { ...base, status: "skipped", reason: "vip_expired" };
  }

  // Cooldown check
  if (config.lastTradeAt) {
    const elapsed = Date.now() - config.lastTradeAt.getTime();
    if (elapsed < COOLDOWN_MS) {
      const remainMin = Math.ceil((COOLDOWN_MS - elapsed) / 60_000);
      return { ...base, status: "skipped", reason: `cooldown_${remainMin}m` };
    }
  }

  // Daily limit check
  const todayStart = startOfDayUTC();
  const todayCount = await prisma.aiTradeProposal.count({
    where: {
      userId,
      timeframe: "M5_AUTO",
      confirmedAt: { gte: todayStart },
    },
  });
  if (todayCount >= config.maxPerDay) {
    return { ...base, status: "skipped", reason: `max_per_day_${config.maxPerDay}` };
  }

  // Fetch quote
  const def = QUOTE_DEFINITIONS.find((d) => d.symbol === config.symbol);
  if (!def) return { ...base, status: "failed", reason: "symbol_not_found" };

  const quotesResponse = await resolveQuotes();
  const liveQuote = quotesResponse.quotes.find((q) => q.symbol === config.symbol);
  const quote = liveQuote
    ? { symbol: liveQuote.symbol, name: liveQuote.name, group: liveQuote.group, bid: liveQuote.bid, ask: liveQuote.ask, changePct: liveQuote.changePct }
    : { symbol: def.symbol, name: def.name, group: def.group, bid: def.mockMid, ask: def.mockMid, changePct: 0 };

  // AI analysis
  let ai;
  try {
    const tvContext = await getScalpingTechnicalContext(quote).catch(() => null);
    ai = await getScalpingAiSuggestion(quote, tvContext, null, "vi");
  } catch {
    return { ...base, status: "failed", reason: "ai_error" };
  }

  // Quality gate
  if (ai.qualityScore < config.minScore) {
    return {
      ...base, status: "skipped", reason: `low_score_${ai.qualityScore}`,
      qualityScore: ai.qualityScore, confidence: ai.confidence,
    };
  }
  if (ai.confidence < config.minConfidence) {
    return {
      ...base, status: "skipped", reason: `low_confidence_${ai.confidence}`,
      qualityScore: ai.qualityScore, confidence: ai.confidence,
    };
  }

  // Auto-confirm: create Signal + AiTradeProposal
  const validLot = Math.round(config.lotSize * 100) / 100;
  const notes = [
    `AI Auto-Scalp · Confidence: ${ai.confidence}/5 · Score: ${ai.qualityScore}/100`,
    `Lot size: ${validLot}`,
    "",
    ai.reasoning,
  ].join("\n");

  const signal = await prisma.signal.create({
    data: {
      authorId: userId,
      symbol: quote.symbol.toUpperCase(),
      direction: ai.direction,
      entry: ai.entry,
      stopLoss: ai.stopLoss,
      takeProfit: ai.takeProfit,
      tier: "FREE",
      notes,
    },
    select: {
      id: true, symbol: true, direction: true, entry: true,
      stopLoss: true, takeProfit: true, tier: true,
    },
  });

  const connection = await prisma.mt5Connection.findFirst({
    where: { userId, revokedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (connection) {
    await prisma.aiTradeProposal.create({
      data: {
        connectionId: connection.id,
        userId,
        symbol: quote.symbol.toUpperCase(),
        timeframe: "M5_AUTO",
        direction: ai.direction,
        entry: ai.entry,
        stopLoss: ai.stopLoss,
        takeProfit: ai.takeProfit,
        confidence: ai.confidence,
        qualityScore: ai.qualityScore,
        reasoning: ai.reasoning,
        checklist: JSON.parse(JSON.stringify(ai.tradeChecklist)) as Prisma.InputJsonValue,
        status: "CONFIRMED",
        confirmedAt: new Date(),
        signalId: signal.id,
        lotSize: validLot,
      },
    });
  }

  // Update lastTradeAt
  await prisma.autoScalpConfig.update({
    where: { userId },
    data: { lastTradeAt: new Date() },
  });

  // In-app notification to the user themselves (auto-trade placed)
  await prisma.notification.upsert({
    where: {
      userId_dedupeKey: { userId, dedupeKey: `auto-scalp:${signal.id}` },
    },
    create: {
      userId,
      signalId: signal.id,
      kind: "SIGNAL_NEW",
      dedupeKey: `auto-scalp:${signal.id}`,
    },
    update: {},
  });

  // Notify followers + Telegram
  try {
    await notifySignalSubscribers({
      id: signal.id,
      symbol: signal.symbol,
      tier: signal.tier,
      authorId: userId,
    });
  } catch {
    // Non-blocking
  }

  await notifyTelegramNewSignal({
    id: signal.id,
    symbol: signal.symbol,
    direction: signal.direction,
    entry: signal.entry,
    stopLoss: signal.stopLoss,
    takeProfit: signal.takeProfit,
    tier: signal.tier,
    status: "ACTIVE",
  });

  return {
    ...base, status: "traded", signalId: signal.id,
    qualityScore: ai.qualityScore, confidence: ai.confidence,
    direction: ai.direction,
  };
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const configs = await prisma.autoScalpConfig.findMany({
    where: { enabled: true },
    include: {
      user: { select: { vipUntil: true } },
    },
  });

  if (configs.length === 0) {
    return Response.json({ ok: true, ran: 0, results: [] });
  }

  const results = await Promise.allSettled(
    configs.map((cfg) =>
      runAutoScalp(cfg.userId, {
        symbol: cfg.symbol,
        lotSize: cfg.lotSize,
        minScore: cfg.minScore,
        minConfidence: cfg.minConfidence,
        maxPerDay: cfg.maxPerDay,
        lastTradeAt: cfg.lastTradeAt,
        vipUntil: cfg.user.vipUntil,
      }),
    ),
  );

  const output = results.map((r) =>
    r.status === "fulfilled" ? r.value : { status: "failed", reason: String(r.reason) },
  );

  const traded = output.filter((r) => r.status === "traded").length;

  return Response.json({ ok: true, ran: configs.length, traded, results: output });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
