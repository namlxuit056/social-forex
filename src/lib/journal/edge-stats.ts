export type EdgeTrade = {
  symbol: string;
  direction: string;
  result: string;
  pnl: number | null;
  openedAt: string;
  copiedFromSignalId: string | null;
  setup?: string | null;
  emotion?: string | null;
};

export type EdgeRow = {
  key: string;
  wins: number;
  losses: number;
  total: number;
  /** null khi chưa đủ dữ liệu (< 2 lệnh W/L) */
  winRate: number | null;
  pnl: number;
};

export type EdgeSession = "asia" | "london" | "newyork";

/** Phiên giao dịch theo giờ UTC: Á 22–07, Âu 07–13, Mỹ 13–22. */
export function sessionOfUtcHour(hour: number): EdgeSession {
  if (hour >= 22 || hour < 7) return "asia";
  if (hour < 13) return "london";
  return "newyork";
}

function buildRows(
  trades: EdgeTrade[],
  keyOf: (t: EdgeTrade) => string,
): EdgeRow[] {
  const map = new Map<string, { wins: number; losses: number; total: number; pnl: number }>();
  for (const t of trades) {
    if (t.result !== "WIN" && t.result !== "LOSS" && t.result !== "BREAKEVEN") continue;
    const key = keyOf(t);
    const cur = map.get(key) ?? { wins: 0, losses: 0, total: 0, pnl: 0 };
    cur.total += 1;
    cur.pnl += t.pnl ?? 0;
    if (t.result === "WIN") cur.wins += 1;
    if (t.result === "LOSS") cur.losses += 1;
    map.set(key, cur);
  }
  return [...map.entries()]
    .map(([key, v]) => ({
      key,
      wins: v.wins,
      losses: v.losses,
      total: v.total,
      winRate:
        v.wins + v.losses >= 2
          ? Math.round((v.wins / (v.wins + v.losses)) * 1000) / 10
          : null,
      pnl: Math.round(v.pnl * 100) / 100,
    }))
    .sort((a, b) => b.total - a.total);
}

export type EdgeGroups = {
  symbols: EdgeRow[];
  sessions: EdgeRow[];
  directions: EdgeRow[];
  sources: EdgeRow[];
  setups: EdgeRow[];
  emotions: EdgeRow[];
};

export function computeEdgeGroups(trades: EdgeTrade[]): EdgeGroups {
  return {
    symbols: buildRows(trades, (t) => t.symbol.toUpperCase()),
    sessions: buildRows(trades, (t) =>
      sessionOfUtcHour(new Date(t.openedAt).getUTCHours()),
    ),
    directions: buildRows(trades, (t) => t.direction),
    sources: buildRows(trades, (t) =>
      t.copiedFromSignalId ? "signal" : "manual",
    ),
    // Chỉ nhóm các lệnh đã gắn setup — lệnh chưa gắn không nói lên điều gì về setup
    setups: buildRows(
      trades.filter((t) => t.setup != null && t.setup !== ""),
      (t) => t.setup as string,
    ),
    emotions: buildRows(
      trades.filter((t) => t.emotion != null && t.emotion !== ""),
      (t) => t.emotion as string,
    ),
  };
}

/** Nhóm đáng chú ý nhất: winRate thấp nhất trong các nhóm có ≥ minTrades lệnh W/L. */
export function findWorstRow(rows: EdgeRow[], minTrades = 5): EdgeRow | null {
  let worst: EdgeRow | null = null;
  for (const r of rows) {
    if (r.wins + r.losses < minTrades || r.winRate === null) continue;
    if (worst === null || r.winRate < (worst.winRate ?? 100)) worst = r;
  }
  return worst;
}
