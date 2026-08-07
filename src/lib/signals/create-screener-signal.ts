import { prisma } from "@/lib/prisma";
import { notifyTelegramNewSignal } from "@/lib/telegram";
import { notifySignalSubscribers } from "@/lib/signals/notify-on-signal-create";
import { Prisma } from "@/generated/prisma/client";

type ChecklistItem = {
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
};

// AiTradeProposal.timeframe tag for signals born from the screener auto-fire cron —
// lets the auto-review cron find exactly these and no other proposal source.
export const SCREENER_AUTO_TIMEFRAME = "SCREENER_AUTO";

export type ScreenerPickData = {
  symbol: string;
  direction: "LONG" | "SHORT";
  entry: number;
  stopLoss: number;
  takeProfit: number;
  confidence: number;
  qualityScore: number;
  reasoning: string;
  checklist: ChecklistItem[];
  lotSize?: number;
};

/** Shared by the manual "Confirm" button on /screener and the screener auto-fire cron —
 * creates the Signal (+ AiTradeProposal when the author has an MT5 bridge connected) and
 * fires the usual notifications. `timeframe` tags the AiTradeProposal so a later reviewer
 * (e.g. the auto-review cron) can tell auto-fired proposals apart from manual confirms. */
export async function createScreenerSignal(
  userId: string,
  data: ScreenerPickData,
  timeframe: string,
): Promise<{ signalId: string }> {
  const validLot =
    data.lotSize && data.lotSize > 0 ? Math.round(data.lotSize * 100) / 100 : null;

  const notes = [
    `AI Screener · Confidence: ${data.confidence}/5 · Score: ${data.qualityScore}/100`,
    validLot ? `Lot size: ${validLot}` : null,
    "",
    data.reasoning,
  ]
    .filter((l) => l !== null)
    .join("\n");

  // Look up the MT5 connection first: only when one exists will an AiTradeProposal be
  // created and eventually resolved by the bridge, so only then should the signal start
  // as PENDING (unknown market-vs-pending) instead of ACTIVE (a plain social post).
  const connection = await prisma.mt5Connection.findFirst({
    where: { userId, revokedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  const signal = await prisma.signal.create({
    data: {
      authorId: userId,
      symbol: data.symbol.toUpperCase(),
      direction: data.direction,
      entry: data.entry,
      stopLoss: data.stopLoss,
      takeProfit: data.takeProfit,
      tier: "FREE",
      status: connection ? "PENDING" : "ACTIVE",
      notes,
    },
    select: {
      id: true,
      symbol: true,
      direction: true,
      entry: true,
      stopLoss: true,
      takeProfit: true,
      tier: true,
    },
  });

  // Create CONFIRMED AiTradeProposal so MT5 EA picks it up via /api/mt5/ai-signals
  if (connection) {
    await prisma.aiTradeProposal.create({
      data: {
        connectionId: connection.id,
        userId,
        symbol: data.symbol.toUpperCase(),
        timeframe,
        direction: data.direction,
        entry: data.entry,
        stopLoss: data.stopLoss,
        takeProfit: data.takeProfit,
        confidence: data.confidence,
        qualityScore: data.qualityScore,
        reasoning: data.reasoning,
        checklist: JSON.parse(JSON.stringify(data.checklist)) as Prisma.InputJsonValue,
        status: "CONFIRMED",
        confirmedAt: new Date(),
        signalId: signal.id,
        lotSize: validLot,
      },
    });
  }

  // In-app notifications for followers / symbol watchers
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

  // Telegram channel notification
  await notifyTelegramNewSignal({
    id: signal.id,
    symbol: signal.symbol,
    direction: signal.direction,
    entry: signal.entry,
    stopLoss: signal.stopLoss,
    takeProfit: signal.takeProfit,
    tier: signal.tier,
    status: connection ? "PENDING" : "ACTIVE",
  });

  return { signalId: signal.id };
}
