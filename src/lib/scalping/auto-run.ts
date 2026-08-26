import { prisma } from "@/lib/prisma";
import { isVipActive } from "@/lib/vip";
import { resolveQuotes } from "@/lib/quotes/resolve-quotes";
import { QUOTE_DEFINITIONS } from "@/lib/quotes/definitions";
import { getScalpingTechnicalContext } from "@/lib/ai/scalping-tradingview-context";
import { getScalpingAiSuggestion } from "@/lib/ai/scalping-suggest";
import { getAiNewsContext } from "@/lib/ai/news-context";
import { parseMt5TicketSets } from "@/lib/mt5/schemas";
import { notifyTelegramNewSignal } from "@/lib/telegram";
import { notifySignalSubscribers } from "@/lib/signals/notify-on-signal-create";
import { Prisma } from "@/generated/prisma/client";

const COOLDOWN_MS = 30 * 60 * 1000; // 30 phút giữa các lệnh

function startOfDayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

// A Signal is created immediately at confirm time (see runAutoScalp below) and only ever
// gets closed via an Mt5SignalLink once the EA reports back that it actually executed the
// order — a user with no MT5 connection, or a proposal the EA never picked up, leaves the
// Signal stuck at status ACTIVE forever with nothing to close it. Checking Signal.status
// alone would then permanently block re-entry on that symbol even though nothing is really
// open. Instead, verify against the connection's last-known MT5 snapshot directly.
async function hasLiveAutoScalpPosition(userId: string, symbol: string): Promise<boolean> {
  const link = await prisma.mt5SignalLink.findFirst({
    where: {
      connection: { userId },
      signal: { authorId: userId, symbol, status: { in: ["ACTIVE", "PENDING"] } },
    },
    select: {
      kind: true,
      mt5Ticket: true,
      connection: { select: { lastPositions: true, lastOrders: true } },
    },
  });
  if (!link) return false;

  const { activeMt5Tickets, pendingMt5Tickets } = parseMt5TicketSets(
    link.connection.lastPositions,
    link.connection.lastOrders,
  );

  return link.kind === "OPEN_POSITION"
    ? activeMt5Tickets.has(link.mt5Ticket)
    : pendingMt5Tickets.has(link.mt5Ticket);
}

export type ScalpingAutoRunResult = {
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
  symbolId: string;
  symbol: string;
  lotSize: number;
  minScore: number;
  minConfidence: number;
  maxPerDay: number;
  lastTradeAt: Date | null;
  vipUntil: Date | null;
}): Promise<ScalpingAutoRunResult> {
  const base = { userId, symbol: config.symbol };

  if (!isVipActive(config.vipUntil)) {
    return { ...base, status: "skipped", reason: "vip_expired" };
  }

  // Skip if this symbol still has a real, MT5-confirmed open position/order — don't stack
  // a new auto-scalp trade on top of one that hasn't closed yet, regardless of the cooldown
  // timer. Deliberately does NOT key off Signal.status alone (see hasLiveAutoScalpPosition).
  if (await hasLiveAutoScalpPosition(userId, config.symbol.toUpperCase())) {
    return { ...base, status: "skipped", reason: "duplicate_open_signal" };
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
    const [tvResult, newsResult] = await Promise.allSettled([
      getScalpingTechnicalContext(quote),
      getAiNewsContext(quote.symbol),
    ]);
    const tvContext = tvResult.status === "fulfilled" ? tvResult.value : null;
    const newsContext = newsResult.status === "fulfilled" ? newsResult.value : null;
    ai = await getScalpingAiSuggestion(quote, tvContext, newsContext, "vi");
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

  // Update lastTradeAt per symbol
  await prisma.autoScalpSymbol.update({
    where: { id: config.symbolId },
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

export type ScalpingAutoRunSummary = {
  ok: true;
  ran: number;
  traded: number;
  results: (ScalpingAutoRunResult | { status: "failed"; reason: string })[];
};

/** Runs every enabled AutoScalpConfig × AutoScalpSymbol pair for VIP users, firing a
 * trade when the AI quality/confidence gates pass. Shared by the cron
 * (/api/scalping/auto-run) and the manual "Run now" trigger in /admin/crons. */
export async function runScalpingAutoRunAll(): Promise<ScalpingAutoRunSummary> {
  const configs = await prisma.autoScalpConfig.findMany({
    where: { enabled: true },
    include: {
      user: { select: { vipUntil: true } },
      symbols: { where: { enabled: true } },
    },
  });

  // Flatten to (config, symbol) pairs
  const tasks = configs.flatMap((cfg) =>
    cfg.symbols.map((sym) => ({
      userId: cfg.userId,
      symbolId: sym.id,
      symbol: sym.symbol,
      lotSize: sym.lotSize,
      minScore: cfg.minScore,
      minConfidence: cfg.minConfidence,
      maxPerDay: cfg.maxPerDay,
      lastTradeAt: sym.lastTradeAt,
      vipUntil: cfg.user.vipUntil,
    })),
  );

  if (tasks.length === 0) {
    return { ok: true, ran: 0, traded: 0, results: [] };
  }

  const results = await Promise.allSettled(
    tasks.map((task) =>
      runAutoScalp(task.userId, {
        symbolId: task.symbolId,
        symbol: task.symbol,
        lotSize: task.lotSize,
        minScore: task.minScore,
        minConfidence: task.minConfidence,
        maxPerDay: task.maxPerDay,
        lastTradeAt: task.lastTradeAt,
        vipUntil: task.vipUntil,
      }),
    ),
  );

  const output = results.map((r) =>
    r.status === "fulfilled" ? r.value : { status: "failed" as const, reason: String(r.reason) },
  );

  const traded = output.filter((r) => r.status === "traded").length;

  return { ok: true, ran: tasks.length, traded, results: output };
}
