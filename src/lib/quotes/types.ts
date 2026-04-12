export type QuoteGroup = "major" | "minor" | "metal" | "energy" | "crypto";

export type QuoteRow = {
  symbol: string;
  name: string;
  group: QuoteGroup;
  bid: number;
  ask: number;
  changePct: number;
};

export type QuotesSource = "yahoo" | "massive" | "mock" | "mock_fallback";

export type QuotesWarningKey = "mockData" | "providerFallback";

export type QuotesApiResponse = {
  updatedAt: string;
  quotes: QuoteRow[];
  source: QuotesSource;
  /** Client translates via next-intl using `quotes.warning*` keys */
  warningKey?: QuotesWarningKey;
  warningParams?: { source: string; message: string };
};
