import { prisma } from "@/lib/prisma";
import { resolveQuotes } from "@/lib/quotes/resolve-quotes";
import {
  classifyOutcome,
  OUTCOME_HORIZON_HOURS,
  type OutcomeResult,
} from "@/lib/quotes/signal-outcomes";

/** Giá mid spot hiện tại theo ký hiệu app (QUOTE_DEFINITIONS). Rỗng nếu provider lỗi. */
export async function currentMidPrices(): Promise<Map<string, number>> {
  try {
    const { quotes } = await resolveQuotes();
    return new Map(
      quotes
        .filter((q) => Number.isFinite(q.bid) && Number.isFinite(q.ask) && q.bid > 0)
        .map((q) => [q.symbol, (q.bid + q.ask) / 2]),
    );
  } catch {
    return new Map();
  }
}

export type RecordSignalOutcomeInput = {
  dedupeKey: string;
  source: string;
  symbol: string;
  signal: "buy" | "sell";
  stance: "trend" | "contrarian";
  firedAt: Date;
  entryPrice: number;
};

/**
 * Lưu 1 dòng theo dõi kết quả cho sự kiện tín hiệu (idempotent theo dedupeKey — lần ghi đầu
 * thắng, các lần sau no-op). Bỏ qua khi entryPrice không hợp lệ (không có giá tham chiếu).
 */
export async function recordSignalOutcome(input: RecordSignalOutcomeInput): Promise<void> {
  if (!Number.isFinite(input.entryPrice) || input.entryPrice <= 0) return;
  try {
    await prisma.signalOutcome.upsert({
      where: { dedupeKey: input.dedupeKey },
      create: {
        dedupeKey: input.dedupeKey,
        source: input.source,
        symbol: input.symbol,
        signal: input.signal,
        stance: input.stance,
        firedAt: input.firedAt,
        entryPrice: input.entryPrice,
      },
      update: {},
    });
  } catch (e) {
    console.error("[signal-outcome] record failed", input.dedupeKey, e);
  }
}

export type EvaluateOutcomesResult = {
  evaluated: number;
  wins: number;
  losses: number;
  flats: number;
  /** Tới hạn chấm nhưng chưa có giá spot cho symbol — để lại chờ lần sau. */
  skippedNoPrice: number;
};

/**
 * Chấm các tín hiệu đã đủ `OUTCOME_HORIZON_HOURS` mà chưa có kết quả. Dùng giá spot hiện tại
 * (app không lưu giá lịch sử) — nếu cron bị tắt một thời gian, exit sẽ được đo muộn hơn horizon;
 * bảng điểm lọc theo firedAt nên vài dòng lệch không làm sai lệch đáng kể và tự lành ở lần chạy sau.
 */
export async function evaluateSignalOutcomes(): Promise<EvaluateOutcomesResult> {
  const now = new Date();
  const horizonCutoff = new Date(now.getTime() - OUTCOME_HORIZON_HOURS * 60 * 60 * 1000);

  const pending = await prisma.signalOutcome.findMany({
    where: { evaluatedAt: null, firedAt: { lte: horizonCutoff } },
    take: 500,
    orderBy: { firedAt: "asc" },
  });

  const result: EvaluateOutcomesResult = {
    evaluated: 0,
    wins: 0,
    losses: 0,
    flats: 0,
    skippedNoPrice: 0,
  };
  if (pending.length === 0) return result;

  const prices = await currentMidPrices();

  const updates: { id: string; exitPrice: number; result: OutcomeResult; favorPct: number }[] = [];
  for (const row of pending) {
    const exitPrice = prices.get(row.symbol);
    if (exitPrice === undefined) {
      result.skippedNoPrice += 1;
      continue;
    }
    const signal = row.signal === "sell" ? "sell" : "buy";
    const { result: r, favorPct } = classifyOutcome(signal, row.entryPrice, exitPrice);
    updates.push({ id: row.id, exitPrice, result: r, favorPct });
    if (r === "win") result.wins += 1;
    else if (r === "loss") result.losses += 1;
    else result.flats += 1;
  }

  if (updates.length > 0) {
    await prisma.$transaction(
      updates.map((u) =>
        prisma.signalOutcome.update({
          where: { id: u.id },
          data: {
            evaluatedAt: now,
            exitPrice: u.exitPrice,
            result: u.result,
            favorPct: u.favorPct,
          },
        }),
      ),
    );
    result.evaluated = updates.length;
  }

  return result;
}
