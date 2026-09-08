import { SIGNAL_SOURCES, type SignalSource } from "@/lib/quotes/signal-sources";

/** Khoảng thời gian chờ trước khi chấm 1 tín hiệu (giá spot lúc chấm vs giá lúc phát). */
export const OUTCOME_HORIZON_HOURS = 72;

/** |biến động| dưới ngưỡng này (theo %) coi như "đi ngang" — không tính đúng/sai hướng. */
export const FLAT_BAND_PCT = 0.1;

export type OutcomeResult = "win" | "loss" | "flat";

/**
 * Chấm 1 tín hiệu tại 1 điểm giá: so giá lúc phát với giá sau `OUTCOME_HORIZON_HOURS`.
 * `favorPct` = % biến động THEO CHIỀU tín hiệu (buy: giá tăng là dương; sell: giá giảm là dương).
 * Đây là thước đo "đúng hướng ngắn hạn", KHÔNG phải P/L thực tế (app không lưu giá lịch sử
 * để tính MFE/MAE hay TP/SL chạm trước).
 */
export function classifyOutcome(
  signal: "buy" | "sell",
  entryPrice: number,
  exitPrice: number,
): { result: OutcomeResult; favorPct: number } {
  const rawPct = ((exitPrice - entryPrice) / entryPrice) * 100;
  const favorPct = signal === "buy" ? rawPct : -rawPct;
  const result: OutcomeResult =
    Math.abs(favorPct) < FLAT_BAND_PCT ? "flat" : favorPct > 0 ? "win" : "loss";
  return { result, favorPct };
}

export type OutcomeRow = {
  source: string;
  firedAt: Date;
  result: OutcomeResult | null;
  favorPct: number | null;
};

export type SourceScore = {
  source: SignalSource;
  /** Số tín hiệu đã chấm (win + loss + flat). */
  evaluated: number;
  wins: number;
  losses: number;
  flats: number;
  /** wins / (wins + losses) — null khi chưa có tín hiệu đúng/sai hướng nào. */
  winRate: number | null;
  /** Trung bình favorPct trên các tín hiệu đã chấm — null khi evaluated = 0. */
  avgFavorPct: number | null;
  /** Số tín hiệu đã phát nhưng chưa đủ horizon để chấm. */
  pending: number;
};

export type SourceScorecard = {
  windowDays: number;
  sources: SourceScore[];
};

/**
 * Gộp các dòng SignalOutcome thành bảng điểm theo nguồn, chỉ tính tín hiệu phát trong
 * `windowDays` ngày gần nhất (tính theo `firedAt`). Luôn trả đủ 5 nguồn kể cả khi rỗng.
 */
export function computeSourceScorecard(
  rows: OutcomeRow[],
  opts: { now?: Date; windowDays: number },
): SourceScorecard {
  const now = opts.now ?? new Date();
  const cutoff = now.getTime() - opts.windowDays * 24 * 60 * 60 * 1000;

  const bySource = new Map<string, OutcomeRow[]>();
  for (const row of rows) {
    if (row.firedAt.getTime() < cutoff) continue;
    const list = bySource.get(row.source);
    if (list) list.push(row);
    else bySource.set(row.source, [row]);
  }

  const sources: SourceScore[] = SIGNAL_SOURCES.map((source) => {
    const list = bySource.get(source) ?? [];
    let wins = 0;
    let losses = 0;
    let flats = 0;
    let pending = 0;
    let favorSum = 0;
    let favorCount = 0;
    for (const row of list) {
      if (row.result === null) {
        pending += 1;
        continue;
      }
      if (row.result === "win") wins += 1;
      else if (row.result === "loss") losses += 1;
      else flats += 1;
      if (typeof row.favorPct === "number") {
        favorSum += row.favorPct;
        favorCount += 1;
      }
    }
    const decided = wins + losses;
    const evaluated = wins + losses + flats;
    return {
      source,
      evaluated,
      wins,
      losses,
      flats,
      winRate: decided > 0 ? wins / decided : null,
      avgFavorPct: favorCount > 0 ? favorSum / favorCount : null,
      pending,
    };
  });

  return { windowDays: opts.windowDays, sources };
}
