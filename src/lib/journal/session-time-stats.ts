import { realizedR, type RTrade } from "./r-multiple";
import { sessionOfUtcHour, type EdgeSession } from "./edge-stats";

export type SessionTimeTrade = RTrade & { openedAt: string | Date };

export type GroupStat = {
  key: string;
  total: number;
  wins: number;
  losses: number;
  winRate: number | null;
  netPnl: number;
  avgR: number | null;
  expectancy: number | null;
};

function buildGroupStats(
  trades: SessionTimeTrade[],
  keyOf: (t: SessionTimeTrade) => string,
): GroupStat[] {
  const map = new Map<string, SessionTimeTrade[]>();
  for (const t of trades) {
    if (t.result !== "WIN" && t.result !== "LOSS" && t.result !== "BREAKEVEN") continue;
    const key = keyOf(t);
    const arr = map.get(key) ?? [];
    arr.push(t);
    map.set(key, arr);
  }
  return [...map.entries()].map(([key, arr]) => {
    const wins = arr.filter((t) => t.result === "WIN").length;
    const losses = arr.filter((t) => t.result === "LOSS").length;
    const netPnl = arr.reduce((s, t) => s + (t.pnl ?? 0), 0);
    const rValues = arr.map(realizedR).filter((r): r is number => r !== null);
    const avgR =
      rValues.length > 0
        ? Math.round((rValues.reduce((s, r) => s + r, 0) / rValues.length) * 100) / 100
        : null;
    return {
      key,
      total: arr.length,
      wins,
      losses,
      winRate:
        wins + losses >= 2 ? Math.round((wins / (wins + losses)) * 1000) / 10 : null,
      netPnl: Math.round(netPnl * 100) / 100,
      avgR,
      expectancy: arr.length > 0 ? Math.round((netPnl / arr.length) * 100) / 100 : null,
    };
  });
}

export type SessionStats = Record<EdgeSession, GroupStat | null>;

export function computeSessionStats(trades: SessionTimeTrade[]): SessionStats {
  const rows = buildGroupStats(trades, (t) =>
    sessionOfUtcHour(new Date(t.openedAt).getUTCHours()),
  );
  const byKey = new Map(rows.map((r) => [r.key, r]));
  return {
    asia: byKey.get("asia") ?? null,
    london: byKey.get("london") ?? null,
    newyork: byKey.get("newyork") ?? null,
  };
}

export const TIME_WINDOWS = [
  { key: "00-04", from: 0, to: 4 },
  { key: "04-08", from: 4, to: 8 },
  { key: "08-12", from: 8, to: 12 },
  { key: "12-16", from: 12, to: 16 },
  { key: "16-20", from: 16, to: 20 },
  { key: "20-24", from: 20, to: 24 },
] as const;

/** Nhóm theo khung 4h (giờ UTC mở lệnh), chỉ trả các khung có ít nhất 1 lệnh đã đóng. */
export function computeTimeWindowStats(trades: SessionTimeTrade[]): GroupStat[] {
  return buildGroupStats(trades, (t) => {
    const h = new Date(t.openedAt).getUTCHours();
    const w = TIME_WINDOWS.find((w) => h >= w.from && h < w.to);
    return w ? w.key : "unknown";
  }).sort((a, b) => a.key.localeCompare(b.key));
}
