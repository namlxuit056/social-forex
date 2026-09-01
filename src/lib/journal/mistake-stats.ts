import { TRADE_MISTAKES, type MistakeTag } from "./mistakes";

export type MistakeStatTrade = {
  result: string;
  pnl: number | null;
  mistakes: string[];
};

export type MistakeStat = {
  tag: MistakeTag;
  /** số lệnh đã đóng gắn tag này */
  count: number;
  wins: number;
  losses: number;
  /** % thắng trong số lệnh W/L có tag — null khi < 2 lệnh W/L */
  winRate: number | null;
  /** tổng P/L các lệnh đã đóng có tag (chỉ lệnh có pnl) */
  totalPnl: number;
  /** P/L trung bình — null khi không có lệnh nào có pnl */
  avgPnl: number | null;
};

export type MistakeStats = {
  /** mỗi tag xuất hiện ≥ 1 lần, sort theo totalPnl tăng dần (âm nhất trước) */
  rows: MistakeStat[];
  /** số lệnh đã đóng có ≥ 1 tag lỗi */
  taggedTrades: number;
  /** số lệnh đã đóng không có tag lỗi nào */
  untaggedClosed: number;
  /** win-rate lệnh đã đóng có ≥ 1 lỗi — null khi < 2 lệnh W/L */
  withMistakeWinRate: number | null;
  /** win-rate lệnh đã đóng sạch lỗi — null khi < 2 lệnh W/L */
  withoutMistakeWinRate: number | null;
};

const CLOSED = new Set(["WIN", "LOSS", "BREAKEVEN"]);

function round1(n: number): number {
  return Math.round(n * 1000) / 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function winRateOf(wins: number, losses: number): number | null {
  return wins + losses >= 2 ? round1(wins / (wins + losses)) : null;
}

export function computeMistakeStats(trades: MistakeStatTrade[]): MistakeStats {
  const closed = trades.filter((t) => CLOSED.has(t.result));

  type Acc = { count: number; wins: number; losses: number; totalPnl: number; pnlCount: number };
  const byTag = new Map<MistakeTag, Acc>();

  let taggedTrades = 0;
  let untaggedClosed = 0;
  let withWins = 0;
  let withLosses = 0;
  let withoutWins = 0;
  let withoutLosses = 0;

  for (const t of closed) {
    const tags = t.mistakes.filter((m): m is MistakeTag =>
      (TRADE_MISTAKES as readonly string[]).includes(m),
    );
    const unique = [...new Set(tags)];

    if (unique.length > 0) {
      taggedTrades += 1;
      if (t.result === "WIN") withWins += 1;
      else if (t.result === "LOSS") withLosses += 1;
    } else {
      untaggedClosed += 1;
      if (t.result === "WIN") withoutWins += 1;
      else if (t.result === "LOSS") withoutLosses += 1;
    }

    for (const tag of unique) {
      const acc = byTag.get(tag) ?? {
        count: 0,
        wins: 0,
        losses: 0,
        totalPnl: 0,
        pnlCount: 0,
      };
      acc.count += 1;
      if (t.result === "WIN") acc.wins += 1;
      else if (t.result === "LOSS") acc.losses += 1;
      if (t.pnl !== null) {
        acc.totalPnl += t.pnl;
        acc.pnlCount += 1;
      }
      byTag.set(tag, acc);
    }
  }

  const rows: MistakeStat[] = [...byTag.entries()]
    .map(([tag, acc]) => ({
      tag,
      count: acc.count,
      wins: acc.wins,
      losses: acc.losses,
      winRate: winRateOf(acc.wins, acc.losses),
      totalPnl: round2(acc.totalPnl),
      avgPnl: acc.pnlCount > 0 ? round2(acc.totalPnl / acc.pnlCount) : null,
    }))
    .sort((a, b) => {
      if (a.totalPnl !== b.totalPnl) return a.totalPnl - b.totalPnl;
      return b.count - a.count;
    });

  return {
    rows,
    taggedTrades,
    untaggedClosed,
    withMistakeWinRate: winRateOf(withWins, withLosses),
    withoutMistakeWinRate: winRateOf(withoutWins, withoutLosses),
  };
}
