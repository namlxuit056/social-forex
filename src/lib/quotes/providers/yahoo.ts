import { QUOTE_DEFINITIONS } from "@/lib/quotes/definitions";
import type { QuoteRow } from "@/lib/quotes/types";
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

function decimalsFor(def: (typeof QUOTE_DEFINITIONS)[0], mid: number) {
  if (def.group === "crypto") return 2;
  if (def.group === "metal" || def.group === "energy")
    return def.symbol === "XAUUSD" ? 2 : 3;
  if (def.symbol.includes("JPY")) return 3;
  return mid > 50 ? 3 : 5;
}

function spreadFor(def: (typeof QUOTE_DEFINITIONS)[0], mid: number) {
  if (def.group === "crypto") return mid * 0.0002;
  if (def.group === "metal") return mid * 0.0001;
  if (def.group === "energy") return 0.03;
  if (def.symbol.includes("JPY")) return 0.02;
  return mid * 0.00015;
}

type YahooQuote = {
  symbol?: string;
  bid?: number;
  ask?: number;
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
};

export async function fetchYahooQuotes(): Promise<QuoteRow[]> {
  const ids = QUOTE_DEFINITIONS.map((d) => d.yahoo);
  const raw = await yahooFinance.quote(ids);
  const arr = Array.isArray(raw) ? raw : [raw];
  const list = arr as unknown as YahooQuote[];

  const byYahoo = new Map<string, YahooQuote>();
  for (const q of list) {
    const sym = q.symbol ?? "";
    if (sym) byYahoo.set(sym, q);
  }

  return QUOTE_DEFINITIONS.map((def) => {
    const q = byYahoo.get(def.yahoo);
    if (!q) {
      const mid = def.mockMid;
      const spread = spreadFor(def, mid);
      const dec = decimalsFor(def, mid);
      return {
        symbol: def.symbol,
        name: def.name,
        group: def.group,
        bid: Number((mid - spread / 2).toFixed(dec)),
        ask: Number((mid + spread / 2).toFixed(dec)),
        changePct: 0,
      };
    }
    const bidRaw = q?.bid;
    const askRaw = q?.ask;
    const mid =
      q?.regularMarketPrice ??
      (typeof bidRaw === "number" && typeof askRaw === "number" && bidRaw > 0 && askRaw > 0
        ? (bidRaw + askRaw) / 2
        : def.mockMid);
    const changePct =
      typeof q?.regularMarketChangePercent === "number"
        ? q.regularMarketChangePercent
        : 0;

    const spread = spreadFor(def, mid);
    const bid =
      typeof bidRaw === "number" && bidRaw > 0 ? bidRaw : mid - spread / 2;
    const ask =
      typeof askRaw === "number" && askRaw > 0 ? askRaw : mid + spread / 2;

    const dec = decimalsFor(def, mid);
    return {
      symbol: def.symbol,
      name: def.name,
      group: def.group,
      bid: Number(bid.toFixed(dec)),
      ask: Number(ask.toFixed(dec)),
      changePct: Number(changePct.toFixed(2)),
    };
  });
}
