import { sessionOfUtcHour } from "./edge-stats";

export type EdgeCheckTrade = {
  symbol: string;
  direction: string;
  result: string;
  openedAt: string | Date;
};

export type EdgeCheckDimension =
  | "symbolDirection"
  | "symbol"
  | "direction"
  | "session"
  | "weekday";

export type EdgeCheckFacet = {
  dimension: EdgeCheckDimension;
  /** symbol / "LONG"|"SHORT" / "XAUUSD LONG" / EdgeSession / getUTCDay() dạng string */
  key: string;
  winRate: number;
  /** Số lệnh W/L (không tính hoà vốn) */
  total: number;
  /** Điểm % chênh so với win rate chung của trader (âm = yếu hơn) */
  gap: number;
};

export type EdgeCheckVerdict = "weak" | "strong" | "neutral";

export type EdgeCheckResult = {
  baselineWinRate: number;
  baselineTotal: number;
  facets: EdgeCheckFacet[];
  verdict: EdgeCheckVerdict;
  /** Facet lệch nhiều nhất theo hướng của verdict — null khi neutral */
  headline: EdgeCheckFacet | null;
};

/** Cần đủ lệnh W/L tổng thì "mức chung" mới có nghĩa để so. */
export const EDGE_CHECK_MIN_BASELINE = 10;
/** Cùng ngưỡng mẫu tối thiểu với findWorstRow/findBestRow. */
export const EDGE_CHECK_MIN_SAMPLE = 5;
/** Lệch tối thiểu (điểm %) so với mức chung mới coi là vùng yếu/mạnh. */
export const EDGE_CHECK_GAP = 15;

/** MT5 dùng BUY/SELL, journal dùng LONG/SHORT. */
export function normalizeDirection(direction: string): "LONG" | "SHORT" | null {
  const d = direction.trim().toUpperCase();
  if (d === "LONG" || d.startsWith("BUY")) return "LONG";
  if (d === "SHORT" || d.startsWith("SELL")) return "SHORT";
  return null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * So win rate của trader trong đúng bối cảnh lệnh sắp vào (cặp / hướng / phiên /
 * thứ) với win rate chung của chính họ. Trả null khi lịch sử chưa đủ để so.
 * `at` = thời điểm vào lệnh; bỏ trống thì không xét phiên/thứ (vd. log lệnh cũ).
 */
export function computeEdgeCheck(
  trades: EdgeCheckTrade[],
  context: { symbol: string; direction: string; at?: Date | null },
): EdgeCheckResult | null {
  const decided = trades.filter((t) => t.result === "WIN" || t.result === "LOSS");
  if (decided.length < EDGE_CHECK_MIN_BASELINE) return null;

  const baselineWins = decided.filter((t) => t.result === "WIN").length;
  const baselineWinRate = round1((baselineWins / decided.length) * 100);

  const symbol = context.symbol.trim().toUpperCase();
  const direction = normalizeDirection(context.direction);
  const at = context.at ?? null;

  const sameSymbol = (t: EdgeCheckTrade) => t.symbol.toUpperCase() === symbol;
  const sameDirection = (t: EdgeCheckTrade) => normalizeDirection(t.direction) === direction;

  const candidates: {
    dimension: EdgeCheckDimension;
    key: string;
    match: (t: EdgeCheckTrade) => boolean;
  }[] = [];
  if (symbol && direction) {
    candidates.push({
      dimension: "symbolDirection",
      key: `${symbol} ${direction}`,
      match: (t) => sameSymbol(t) && sameDirection(t),
    });
  }
  if (symbol) candidates.push({ dimension: "symbol", key: symbol, match: sameSymbol });
  if (direction) candidates.push({ dimension: "direction", key: direction, match: sameDirection });
  if (at) {
    const session = sessionOfUtcHour(at.getUTCHours());
    const weekday = at.getUTCDay();
    candidates.push({
      dimension: "session",
      key: session,
      match: (t) => sessionOfUtcHour(new Date(t.openedAt).getUTCHours()) === session,
    });
    candidates.push({
      dimension: "weekday",
      key: String(weekday),
      match: (t) => new Date(t.openedAt).getUTCDay() === weekday,
    });
  }

  const facets: EdgeCheckFacet[] = [];
  for (const c of candidates) {
    const subset = decided.filter(c.match);
    if (subset.length < EDGE_CHECK_MIN_SAMPLE) continue;
    const winRate = round1((subset.filter((t) => t.result === "WIN").length / subset.length) * 100);
    facets.push({
      dimension: c.dimension,
      key: c.key,
      winRate,
      total: subset.length,
      gap: round1(winRate - baselineWinRate),
    });
  }

  // Vùng yếu được ưu tiên hơn vùng mạnh: một lý do để dừng lại quan trọng hơn một lý do để yên tâm.
  const weakest = facets.reduce<EdgeCheckFacet | null>(
    (acc, f) => (f.gap <= -EDGE_CHECK_GAP && (acc === null || f.gap < acc.gap) ? f : acc),
    null,
  );
  const strongest = facets.reduce<EdgeCheckFacet | null>(
    (acc, f) => (f.gap >= EDGE_CHECK_GAP && (acc === null || f.gap > acc.gap) ? f : acc),
    null,
  );
  const headline = weakest ?? strongest;

  return {
    baselineWinRate,
    baselineTotal: decided.length,
    facets,
    verdict: weakest ? "weak" : strongest ? "strong" : "neutral",
    headline,
  };
}

const SESSION_LABEL_EN: Record<string, string> = {
  asia: "the Asia session",
  london: "the London session",
  newyork: "the New York session",
};
const WEEKDAY_LABEL_EN = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];

/** Nhãn tiếng Anh cho /positions (trang này chưa i18n). */
export function edgeFacetLabelEn(facet: Pick<EdgeCheckFacet, "dimension" | "key">): string {
  if (facet.dimension === "session") return SESSION_LABEL_EN[facet.key] ?? facet.key;
  if (facet.dimension === "weekday") return WEEKDAY_LABEL_EN[Number(facet.key)] ?? facet.key;
  if (facet.dimension === "direction") return `${facet.key} trades`;
  return facet.key;
}
