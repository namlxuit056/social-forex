export type QuoteGroup = "major" | "minor" | "metal" | "energy" | "crypto";

export type QuoteRow = {
  symbol: string;
  name: string;
  group: QuoteGroup;
  bid: number;
  ask: number;
  changePct: number;
};

export type QuotesSource = "yahoo" | "mock" | "mock_fallback";

export type QuotesApiResponse = {
  updatedAt: string;
  quotes: QuoteRow[];
  source: QuotesSource;
  /** Thông báo khi dùng fallback hoặc dữ liệu trễ */
  warning?: string;
};
