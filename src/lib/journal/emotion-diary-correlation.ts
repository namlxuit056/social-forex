export type EmotionDiaryDay = { date: string | Date; note: string };
export type EmotionDiaryTrade = { openedAt: string | Date; result: string };
export type DiaryMood = "negative" | "positive" | "neutral";

export type EmotionDiaryGroupStats = {
  total: number;
  wins: number;
  losses: number;
  /** % thắng trong số lệnh W/L — null khi < 2 lệnh W/L */
  winRate: number | null;
};

export type EmotionDiaryCorrelationStats = {
  negativeDays: number;
  positiveDays: number;
  neutralDays: number;
  /** Lệnh log vào ngày có ghi chú tâm trạng tiêu cực */
  negative: EmotionDiaryGroupStats;
  /** Lệnh log vào ngày còn lại (tích cực hoặc trung lập) */
  nonNegative: EmotionDiaryGroupStats;
};

// Từ khoá đã bỏ dấu, so khớp theo nguyên từ/cụm từ (word boundary) trên note đã
// normalize — không phân biệt hoa/thường và dấu tiếng Việt. Ưu tiên tiêu cực khi
// note vừa chứa từ khoá tiêu cực vừa chứa từ khoá tích cực (vd "không tập trung"
// chứa cả "khong tap trung" tiêu cực lẫn "tap trung" tích cực).
const NEGATIVE_KEYWORDS = [
  "met moi",
  "stress",
  "ap luc",
  "chan nan",
  "lo lang",
  "lo au",
  "so hai",
  "gian du",
  "tuc gian",
  "kho chiu",
  "buon ba",
  "buc boi",
  "revenge",
  "fomo",
  "mat kiem soat",
  "hoang loan",
  "panic",
  "overtrade",
  "qua tai",
  "thieu ngu",
  "mat ngu",
  "khong tap trung",
  "mat tap trung",
  "tieu cuc",
  "te hai",
  "kiet suc",
  "burnout",
];

const POSITIVE_KEYWORDS = [
  "tu tin",
  "binh tinh",
  "thoai mai",
  "hao hung",
  "tap trung",
  "minh man",
  "ky luat",
  "on dinh",
  "tich cuc",
  "sang suot",
];

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase();
}

function containsKeyword(normalized: string, keywords: string[]): boolean {
  return keywords.some((k) => new RegExp(`\\b${k}\\b`).test(normalized));
}

/** Phân loại tâm trạng ghi chú theo từ khoá — rule-based, không gọi AI. */
export function classifyDiaryMood(note: string): DiaryMood {
  const normalized = normalize(note);
  if (containsKeyword(normalized, NEGATIVE_KEYWORDS)) return "negative";
  if (containsKeyword(normalized, POSITIVE_KEYWORDS)) return "positive";
  return "neutral";
}

function utcDayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function buildGroup(trades: EmotionDiaryTrade[]): EmotionDiaryGroupStats {
  const closed = trades.filter(
    (t) => t.result === "WIN" || t.result === "LOSS" || t.result === "BREAKEVEN",
  );
  const wins = closed.filter((t) => t.result === "WIN").length;
  const losses = closed.filter((t) => t.result === "LOSS").length;
  return {
    total: closed.length,
    wins,
    losses,
    winRate: wins + losses >= 2 ? Math.round((wins / (wins + losses)) * 1000) / 10 : null,
  };
}

/**
 * So win-rate lệnh log vào ngày có ghi chú tâm trạng tiêu cực (Emotion Diary) với
 * các ngày còn lại — đóng vòng lặp cho Emotion Diary, vốn trước đó chỉ là journal
 * thuần không liên kết với hiệu suất giao dịch.
 */
export function computeEmotionDiaryCorrelation(
  entries: EmotionDiaryDay[],
  trades: EmotionDiaryTrade[],
): EmotionDiaryCorrelationStats {
  const tradesByDay = new Map<string, EmotionDiaryTrade[]>();
  for (const t of trades) {
    const key = utcDayKey(new Date(t.openedAt));
    const arr = tradesByDay.get(key);
    if (arr) arr.push(t);
    else tradesByDay.set(key, [t]);
  }

  let negativeDays = 0;
  let positiveDays = 0;
  let neutralDays = 0;
  const negativeTrades: EmotionDiaryTrade[] = [];
  const nonNegativeTrades: EmotionDiaryTrade[] = [];

  for (const e of entries) {
    const mood = classifyDiaryMood(e.note);
    if (mood === "negative") negativeDays += 1;
    else if (mood === "positive") positiveDays += 1;
    else neutralDays += 1;

    const dayTrades = tradesByDay.get(utcDayKey(new Date(e.date))) ?? [];
    (mood === "negative" ? negativeTrades : nonNegativeTrades).push(...dayTrades);
  }

  return {
    negativeDays,
    positiveDays,
    neutralDays,
    negative: buildGroup(negativeTrades),
    nonNegative: buildGroup(nonNegativeTrades),
  };
}
