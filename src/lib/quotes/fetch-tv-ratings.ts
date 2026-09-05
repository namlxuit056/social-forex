import { QUOTE_DEFINITIONS } from "@/lib/quotes/definitions";
import { TV_TICKER_MAP, type SymbolScores, type TvMarket } from "@/lib/quotes/technical-rating";

const ORIGIN_HEADER = "https://www.tradingview.com";

function scannerUrl(market: TvMarket): string {
  return `https://scanner.tradingview.com/${market}/scan`;
}

async function scanMarket(market: TvMarket, tickers: string[]): Promise<Map<string, SymbolScores>> {
  if (tickers.length === 0) return new Map();

  const res = await fetch(scannerUrl(market), {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: ORIGIN_HEADER },
    body: JSON.stringify({
      symbols: { tickers, query: { types: [] } },
      // Recommend.All: điểm tổng hợp kỹ thuật (-1..1) của TradingView. |240 = khung 4H,
      // không hậu tố = khung mặc định 1D.
      columns: ["Recommend.All|240", "Recommend.All"],
    }),
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`TradingView scanner (${market}) HTTP ${res.status}`);
  }

  const data = (await res.json()) as { data?: { s: string; d: unknown[] }[] };
  const map = new Map<string, SymbolScores>();
  for (const row of data.data ?? []) {
    const [score4h, score1d] = row.d;
    if (typeof score4h === "number" && typeof score1d === "number") {
      map.set(row.s, { score4h, score1d });
    }
  }
  return map;
}

/**
 * Lấy điểm Recommend.All (4H + 1D) cho toàn bộ symbol app hỗ trợ, từ endpoint public
 * đứng sau widget "Technical Analysis" của TradingView. Không phải API chính thức có
 * tài liệu, nhưng public/free, không bị Cloudflare chặn (chỉ cần header Origin) — cùng
 * dạng với economic-calendar.tradingview.com đã dùng cho lịch kinh tế.
 */
export async function fetchTechnicalRatings(): Promise<Map<string, SymbolScores>> {
  const byMarket = new Map<TvMarket, { symbol: string; ticker: string }[]>();
  for (const def of QUOTE_DEFINITIONS) {
    const info = TV_TICKER_MAP[def.symbol];
    if (!info) continue;
    const list = byMarket.get(info.market) ?? [];
    list.push({ symbol: def.symbol, ticker: info.ticker });
    byMarket.set(info.market, list);
  }

  const result = new Map<string, SymbolScores>();
  for (const [market, entries] of byMarket) {
    const scores = await scanMarket(
      market,
      entries.map((e) => e.ticker),
    );
    for (const { symbol, ticker } of entries) {
      const s = scores.get(ticker);
      if (s) result.set(symbol, s);
    }
  }
  return result;
}
