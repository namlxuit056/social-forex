import type { SignalSource, SignalStance } from "@/lib/quotes/signal-sources";

/** Nguồn tín hiệu ngoài TradingView (những nguồn hiển thị trên bảng hướng vào lệnh). */
export type ExternalSource = Exclude<SignalSource, "tradingview">;

/** Dòng notification thô (kind TECHNICAL_RATING_SIGNAL) đã gộp theo dedupeKey. */
export type RawSignalNotif = {
  dedupeKey: string;
  createdAt: Date;
  meta: unknown;
};

export type SourceVote = {
  source: ExternalSource;
  signal: "buy" | "sell";
  stance: SignalStance;
  at: Date;
};

export type SymbolDirection = {
  symbol: string;
  buyCount: number;
  sellCount: number;
  /** Hướng tổng hợp — theo số nguồn đồng thuận. */
  bias: "buy" | "sell" | "mixed";
  latestAt: Date;
  /** Một phiếu / nguồn, lấy tín hiệu mới nhất của nguồn đó. */
  sources: SourceVote[];
};

function parseMeta(meta: unknown): {
  source: ExternalSource;
  symbol: string;
  signal: "buy" | "sell";
  stance: SignalStance;
} | null {
  if (!meta || typeof meta !== "object") return null;
  const m = meta as Record<string, unknown>;
  const source = typeof m.source === "string" ? m.source : null;
  const symbol = typeof m.symbol === "string" ? m.symbol : null;
  const signal = m.signal === "buy" || m.signal === "sell" ? m.signal : null;
  // Loại TradingView và mọi meta thiếu trường cần thiết.
  if (!source || source === "tradingview" || !symbol || !signal) return null;
  const stance: SignalStance = m.stance === "contrarian" ? "contrarian" : "trend";
  return { source: source as ExternalSource, symbol, signal, stance };
}

/**
 * Gộp các notification tín hiệu (đã sắp mới nhất trước, một dòng / dedupeKey) thành
 * bảng hướng vào lệnh theo cặp: mỗi nguồn tính một phiếu (tín hiệu mới nhất của nguồn),
 * `bias` là bên có nhiều nguồn đồng thuận hơn. Không tính tín hiệu TradingView.
 */
export function aggregateSignalDirections(rows: RawSignalNotif[]): SymbolDirection[] {
  const bySymbol = new Map<string, SymbolDirection>();

  for (const row of rows) {
    const parsed = parseMeta(row.meta);
    if (!parsed) continue;

    let entry = bySymbol.get(parsed.symbol);
    if (!entry) {
      entry = {
        symbol: parsed.symbol,
        buyCount: 0,
        sellCount: 0,
        bias: "mixed",
        latestAt: row.createdAt,
        sources: [],
      };
      bySymbol.set(parsed.symbol, entry);
    }

    // rows mới nhất trước → phiếu đầu tiên gặp của mỗi nguồn là tín hiệu mới nhất.
    if (entry.sources.some((s) => s.source === parsed.source)) continue;

    entry.sources.push({
      source: parsed.source,
      signal: parsed.signal,
      stance: parsed.stance,
      at: row.createdAt,
    });
    if (parsed.signal === "buy") entry.buyCount += 1;
    else entry.sellCount += 1;
    if (row.createdAt > entry.latestAt) entry.latestAt = row.createdAt;
  }

  const result = [...bySymbol.values()];
  for (const entry of result) {
    entry.bias =
      entry.buyCount > entry.sellCount
        ? "buy"
        : entry.sellCount > entry.buyCount
          ? "sell"
          : "mixed";
    entry.sources.sort((a, b) => b.at.getTime() - a.at.getTime());
  }
  result.sort((a, b) => b.latestAt.getTime() - a.latestAt.getTime());
  return result;
}
