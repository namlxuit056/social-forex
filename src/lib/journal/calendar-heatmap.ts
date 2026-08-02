export type CalendarTrade = {
  result: string;
  pnl: number | null;
  openedAt: string | Date;
  closedAt: string | Date | null;
};

export type CalendarCell = {
  /** null = ô đệm đầu/cuối tháng, không thuộc tháng đang xem */
  date: Date | null;
  pnl: number;
  trades: number;
  wins: number;
  losses: number;
};

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Lưới tuần (7 cột, CN→T7) cho tháng `month` (0-indexed) của `year`, gộp P/L theo ngày đóng lệnh. */
export function buildMonthGrid(
  trades: CalendarTrade[],
  year: number,
  month: number,
): CalendarCell[][] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = new Date(year, month, 1).getDay();

  const cells: CalendarCell[] = [];
  for (let i = 0; i < startWeekday; i++) {
    cells.push({ date: null, pnl: 0, trades: 0, wins: 0, losses: 0 });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ date: new Date(year, month, day), pnl: 0, trades: 0, wins: 0, losses: 0 });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ date: null, pnl: 0, trades: 0, wins: 0, losses: 0 });
  }

  const indexByKey = new Map<string, number>();
  cells.forEach((c, i) => {
    if (c.date) indexByKey.set(dayKey(c.date), i);
  });

  for (const t of trades) {
    if (t.result === "PENDING") continue;
    const d = new Date(t.closedAt ?? t.openedAt);
    if (!Number.isFinite(d.getTime())) continue;
    const idx = indexByKey.get(dayKey(d));
    if (idx === undefined) continue;
    const cell = cells[idx];
    cell.trades += 1;
    cell.pnl += t.pnl ?? 0;
    if (t.result === "WIN") cell.wins += 1;
    if (t.result === "LOSS") cell.losses += 1;
  }

  const weeks: CalendarCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
