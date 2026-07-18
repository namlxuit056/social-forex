export type RangeMode = "day" | "month" | "year" | "custom";
export type BucketUnit = "day" | "month" | "year";

export interface JournalChartTrade {
  id: string;
  result: string;
  pnl: number | null;
  openedAt: string;
  closedAt: string | null;
}

export interface Bucket {
  key: string;
  label: string;
  pnl: number;
  trades: number;
  wins: number;
  losses: number;
}

export interface EquityPoint {
  date: Date;
  cumPnl: number;
  tradePnl: number;
  label: string;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addUnit(date: Date, unit: BucketUnit, amount: number) {
  const next = new Date(date);
  if (unit === "day") next.setDate(next.getDate() + amount);
  if (unit === "month") next.setMonth(next.getMonth() + amount);
  if (unit === "year") next.setFullYear(next.getFullYear() + amount);
  return next;
}

export function bucketKey(date: Date, unit: BucketUnit) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  if (unit === "day") return `${y}-${m}-${d}`;
  if (unit === "month") return `${y}-${m}`;
  return String(y);
}

export function bucketLabel(date: Date, unit: BucketUnit, locale: string) {
  if (unit === "day")
    return date.toLocaleDateString(locale, { day: "2-digit", month: "2-digit" });
  if (unit === "month")
    return date.toLocaleDateString(locale, { month: "short", year: "2-digit" });
  return date.toLocaleDateString(locale, { year: "numeric" });
}

export function rangeForMode(mode: RangeMode, from: string, to: string) {
  const today = startOfDay(new Date());
  if (mode === "day") {
    const end = today;
    const start = new Date(today);
    start.setDate(start.getDate() - 29);
    return { from: start, to: end, unit: "day" as BucketUnit };
  }
  if (mode === "month") {
    return {
      from: new Date(today.getFullYear(), 0, 1),
      to: new Date(today.getFullYear(), 11, 31),
      unit: "month" as BucketUnit,
    };
  }
  if (mode === "year") {
    return {
      from: new Date(today.getFullYear() - 4, 0, 1),
      to: new Date(today.getFullYear(), 11, 31),
      unit: "year" as BucketUnit,
    };
  }
  const f = from ? startOfDay(new Date(`${from}T00:00:00`)) : today;
  const t = to ? startOfDay(new Date(`${to}T00:00:00`)) : today;
  let s = f <= t ? f : t;
  const e = f <= t ? t : f;
  const days = Math.max(1, Math.round((e.getTime() - s.getTime()) / MS_PER_DAY) + 1);
  const unit: BucketUnit = days <= 45 ? "day" : days <= 730 ? "month" : "year";
  // Chuẩn hóa mốc bắt đầu về đầu kỳ: cộng tháng từ ngày 29–31 sẽ overflow
  // (31/01 + 1 tháng = 03/03) làm mất bucket tháng 2 → trade rơi khỏi chart
  if (unit === "month") s = new Date(s.getFullYear(), s.getMonth(), 1);
  if (unit === "year") s = new Date(s.getFullYear(), 0, 1);
  return { from: s, to: e, unit };
}

export function buildBuckets(
  trades: JournalChartTrade[],
  locale: string,
  mode: RangeMode,
  customFrom: string,
  customTo: string,
) {
  const { from, to, unit } = rangeForMode(mode, customFrom, customTo);
  const map = new Map<string, Bucket>();
  for (let c = new Date(from); c <= to; c = addUnit(c, unit, 1)) {
    const key = bucketKey(c, unit);
    map.set(key, { key, label: bucketLabel(c, unit, locale), pnl: 0, trades: 0, wins: 0, losses: 0 });
  }
  for (const trade of trades) {
    if (trade.result === "PENDING") continue;
    const date = startOfDay(new Date(trade.closedAt ?? trade.openedAt));
    if (date < from || date > to) continue;
    const key = bucketKey(date, unit);
    const bucket = map.get(key);
    if (!bucket) continue;
    bucket.trades += 1;
    bucket.pnl += trade.pnl ?? 0;
    if (trade.result === "WIN") bucket.wins += 1;
    if (trade.result === "LOSS") bucket.losses += 1;
  }
  return Array.from(map.values());
}

export function buildEquityPoints(
  trades: JournalChartTrade[],
  locale: string,
  mode: RangeMode,
  customFrom: string,
  customTo: string,
): EquityPoint[] {
  const { from, to } = rangeForMode(mode, customFrom, customTo);
  const sorted = trades
    .filter((t) => t.result !== "PENDING" && t.closedAt)
    .filter((t) => {
      const d = new Date(t.closedAt!);
      return d >= from && d <= to;
    })
    .sort((a, b) => new Date(a.closedAt!).getTime() - new Date(b.closedAt!).getTime());

  let cum = 0;
  const points: EquityPoint[] = [
    { date: from, cumPnl: 0, tradePnl: 0, label: bucketLabel(from, "day", locale) },
  ];
  for (const trade of sorted) {
    cum += trade.pnl ?? 0;
    const date = new Date(trade.closedAt!);
    points.push({
      date,
      cumPnl: cum,
      tradePnl: trade.pnl ?? 0,
      label: date.toLocaleDateString(locale, { month: "short", day: "numeric" }),
    });
  }
  return points;
}

/** Lệnh đã đóng nằm trong range đang chọn — dùng cho stats cần khớp scope với chart. */
export function tradesInRange(
  trades: JournalChartTrade[],
  mode: RangeMode,
  customFrom: string,
  customTo: string,
): JournalChartTrade[] {
  const { from, to } = rangeForMode(mode, customFrom, customTo);
  return trades.filter((t) => {
    if (t.result === "PENDING") return false;
    const date = startOfDay(new Date(t.closedAt ?? t.openedAt));
    return date >= from && date <= to;
  });
}
