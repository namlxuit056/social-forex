import { QUOTE_DEFINITIONS } from "@/lib/quotes/definitions";
import { toTradingViewSymbol } from "@/lib/quotes/tradingview-symbols";
import type { QuoteGroup, QuoteRow } from "@/lib/quotes/types";

type ScannerMarket = "forex" | "cfd" | "crypto" | "futures";

type ScannerRow = {
  s?: string;
  d?: Array<number | string | null>;
};

type ScannerResponse = {
  data?: ScannerRow[] | null;
};

const MARKET_COLUMNS: Record<ScannerMarket, string[]> = {
  forex: ["close", "bid", "ask", "change"],
  cfd: ["close", "bid", "ask", "change"],
  crypto: ["close", "bid", "ask", "change"],
  futures: ["close", "change"],
};

function marketForGroup(group: QuoteGroup): ScannerMarket {
  if (group === "crypto") return "crypto";
  if (group === "metal") return "cfd";
  if (group === "energy") return "futures";
  return "forex";
}

function decimalsFor(group: QuoteGroup, symbol: string, mid: number) {
  if (group === "crypto") return 2;
  if (group === "metal" || group === "energy") {
    return symbol === "XAUUSD" ? 2 : 3;
  }
  if (symbol.includes("JPY")) return 3;
  return mid > 50 ? 3 : 5;
}

function spreadFor(group: QuoteGroup, symbol: string, mid: number) {
  if (group === "crypto") return mid * 0.0002;
  if (group === "metal") return mid * 0.0001;
  if (group === "energy") return 0.03;
  if (symbol.includes("JPY")) return 0.02;
  return mid * 0.00015;
}

function numeric(value: number | string | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

async function scanMarket(
  market: ScannerMarket,
  tickers: string[],
): Promise<Map<string, ScannerRow>> {
  if (tickers.length === 0) return new Map();

  const response = await fetch(`https://scanner.tradingview.com/${market}/scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      symbols: {
        tickers,
        query: { types: [] },
      },
      columns: MARKET_COLUMNS[market],
    }),
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error(`TradingView ${market} scanner HTTP ${response.status}`);
  }

  const json = (await response.json()) as ScannerResponse;
  const rows = new Map<string, ScannerRow>();
  for (const row of json.data ?? []) {
    if (row.s) rows.set(row.s, row);
  }
  return rows;
}

export async function fetchTradingViewQuotes(): Promise<QuoteRow[]> {
  const tickersByMarket = new Map<ScannerMarket, string[]>();

  for (const def of QUOTE_DEFINITIONS) {
    const market = marketForGroup(def.group);
    const tickers = tickersByMarket.get(market) ?? [];
    tickers.push(toTradingViewSymbol(def.symbol));
    tickersByMarket.set(market, tickers);
  }

  const scans = await Promise.all(
    [...tickersByMarket.entries()].map(async ([market, tickers]) => [
      market,
      await scanMarket(market, tickers),
    ] as const),
  );
  const rowsByMarket = new Map(scans);

  return QUOTE_DEFINITIONS.map((def) => {
    const market = marketForGroup(def.group);
    const tvSymbol = toTradingViewSymbol(def.symbol);
    const row = rowsByMarket.get(market)?.get(tvSymbol);
    const values = row?.d ?? [];

    const close = numeric(values[0]) ?? def.mockMid;
    const bidRaw = market === "futures" ? null : numeric(values[1]);
    const askRaw = market === "futures" ? null : numeric(values[2]);
    const changeRaw = market === "futures" ? numeric(values[1]) : numeric(values[3]);

    const syntheticSpread = spreadFor(def.group, def.symbol, close);
    const bid = bidRaw && bidRaw > 0 ? bidRaw : close - syntheticSpread / 2;
    const ask = askRaw && askRaw > 0 ? askRaw : close + syntheticSpread / 2;
    const mid = (bid + ask) / 2;
    const decimals = decimalsFor(def.group, def.symbol, mid);

    return {
      symbol: def.symbol,
      name: def.name,
      group: def.group,
      bid: Number(bid.toFixed(decimals)),
      ask: Number(ask.toFixed(decimals)),
      changePct: Number((changeRaw ?? 0).toFixed(2)),
    };
  });
}
