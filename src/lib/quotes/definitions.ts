import type { QuoteGroup } from "@/lib/quotes/types";

/** Định nghĩa cặp hiển thị + Yahoo symbol + giá giả lập khi fallback. */
export type QuoteDefinition = {
  symbol: string;
  name: string;
  group: QuoteGroup;
  /**
   * Yahoo Finance symbol. Gold/silver spot tickers `XAUUSD=X` / `XAGUSD=X`
   * often return no data; we use liquid COMEX futures as price proxy.
   */
  yahoo: string;
  mockMid: number;
};

export const QUOTE_DEFINITIONS: QuoteDefinition[] = [
  { symbol: "EURUSD", name: "Euro / USD", group: "major", yahoo: "EURUSD=X", mockMid: 1.085 },
  { symbol: "GBPUSD", name: "Bảng Anh / USD", group: "major", yahoo: "GBPUSD=X", mockMid: 1.265 },
  { symbol: "USDJPY", name: "USD / Yên", group: "major", yahoo: "USDJPY=X", mockMid: 149.2 },
  { symbol: "AUDUSD", name: "Úc / USD", group: "major", yahoo: "AUDUSD=X", mockMid: 0.652 },
  { symbol: "USDCAD", name: "USD / CAD", group: "major", yahoo: "USDCAD=X", mockMid: 1.358 },
  { symbol: "NZDUSD", name: "NZD / USD", group: "major", yahoo: "NZDUSD=X", mockMid: 0.592 },
  { symbol: "USDCHF", name: "USD / Franc", group: "major", yahoo: "USDCHF=X", mockMid: 0.884 },
  { symbol: "EURGBP", name: "Euro / Bảng", group: "minor", yahoo: "EURGBP=X", mockMid: 0.858 },
  { symbol: "EURJPY", name: "Euro / Yên", group: "minor", yahoo: "EURJPY=X", mockMid: 161.9 },
  { symbol: "GBPJPY", name: "Bảng / Yên", group: "minor", yahoo: "GBPJPY=X", mockMid: 188.7 },
  { symbol: "XAUUSD", name: "Vàng spot", group: "metal", yahoo: "GC=F", mockMid: 2650 },
  { symbol: "XAGUSD", name: "Bạc spot", group: "metal", yahoo: "SI=F", mockMid: 31.2 },
  { symbol: "USOIL", name: "Dầu WTI (tham chiếu)", group: "energy", yahoo: "CL=F", mockMid: 78.4 },
  { symbol: "BTCUSD", name: "Bitcoin", group: "crypto", yahoo: "BTC-USD", mockMid: 98500 },
  { symbol: "ETHUSD", name: "Ethereum", group: "crypto", yahoo: "ETH-USD", mockMid: 3450 },
];

export const QUOTE_BY_SYMBOL = Object.fromEntries(
  QUOTE_DEFINITIONS.map((d) => [d.symbol, d]),
) as Record<string, QuoteDefinition>;
