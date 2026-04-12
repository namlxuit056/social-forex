import { QUOTE_DEFINITIONS } from "@/lib/quotes/definitions";
import type { QuoteRow } from "@/lib/quotes/types";

const BASE = "https://api.massive.com";

function getApiKey(): string {
  const key = process.env.MASSIVE_API_KEY;
  if (!key) throw new Error("MASSIVE_API_KEY is not set");
  return key;
}

function massiveTicker(symbol: string, group: string): string {
  if (group === "crypto") return `X:${symbol}`;
  if (group === "energy") return "";
  return `C:${symbol}`;
}

type SnapshotTicker = {
  ticker: string;
  lastQuote?: { a?: number; b?: number; t?: number };
  todaysChangePerc?: number;
  day?: { c?: number; o?: number };
  prevDay?: { c?: number };
};

type LastQuoteResp = {
  last?: { ask?: number; bid?: number; timestamp?: number };
  status?: string;
};

async function fetchSnapshot(
  tickers: string[],
  apiKey: string,
): Promise<Map<string, SnapshotTicker>> {
  const tickerParam = tickers.join(",");
  const url = `${BASE}/v2/snapshot/locale/global/markets/forex/tickers?tickers=${tickerParam}&apiKey=${apiKey}`;

  const res = await fetch(url, {
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`Massive snapshot HTTP ${res.status}: ${await res.text().catch(() => "")}`);
  }

  const data = (await res.json()) as { tickers?: SnapshotTicker[] };
  const map = new Map<string, SnapshotTicker>();
  for (const t of data.tickers ?? []) {
    map.set(t.ticker, t);
  }
  return map;
}

async function fetchLastQuote(
  from: string,
  to: string,
  apiKey: string,
): Promise<{ bid: number; ask: number } | null> {
  const url = `${BASE}/v1/last_quote/currencies/${from}/${to}?apiKey=${apiKey}`;
  const res = await fetch(url, {
    next: { revalidate: 0 },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as LastQuoteResp;
  if (!data.last?.bid || !data.last?.ask) return null;
  return { bid: data.last.bid, ask: data.last.ask };
}

function decimalsFor(group: string, symbol: string, mid: number) {
  if (group === "crypto") return 2;
  if (group === "metal" || group === "energy")
    return symbol === "XAUUSD" ? 2 : 3;
  if (symbol.includes("JPY")) return 3;
  return mid > 50 ? 3 : 5;
}

function spreadFor(group: string, symbol: string, mid: number) {
  if (group === "crypto") return mid * 0.0002;
  if (group === "metal") return mid * 0.0001;
  if (group === "energy") return 0.03;
  if (symbol.includes("JPY")) return 0.02;
  return mid * 0.00015;
}

export async function fetchMassiveQuotes(): Promise<QuoteRow[]> {
  const apiKey = getApiKey();

  const forexDefs = QUOTE_DEFINITIONS.filter(
    (d) => d.group !== "energy",
  );
  const tickers = forexDefs
    .map((d) => massiveTicker(d.symbol, d.group))
    .filter(Boolean);

  const snapshotMap = await fetchSnapshot(tickers, apiKey);

  const results: QuoteRow[] = [];

  for (const def of QUOTE_DEFINITIONS) {
    const ticker = massiveTicker(def.symbol, def.group);
    const snap = ticker ? snapshotMap.get(ticker) : undefined;

    let bid: number;
    let ask: number;
    let changePct: number;

    if (snap?.lastQuote?.b && snap?.lastQuote?.a) {
      bid = snap.lastQuote.b;
      ask = snap.lastQuote.a;
      changePct = snap.todaysChangePerc ?? 0;
    } else if (ticker && def.group !== "energy") {
      const from = def.symbol.slice(0, 3);
      const to = def.symbol.slice(3);
      const lq = await fetchLastQuote(from, to, apiKey);
      if (lq) {
        bid = lq.bid;
        ask = lq.ask;
        changePct = 0;
      } else {
        const mid = def.mockMid;
        const sp = spreadFor(def.group, def.symbol, mid);
        bid = mid - sp / 2;
        ask = mid + sp / 2;
        changePct = 0;
      }
    } else {
      const mid = def.mockMid;
      const sp = spreadFor(def.group, def.symbol, mid);
      bid = mid - sp / 2;
      ask = mid + sp / 2;
      changePct = 0;
    }

    const mid = (bid + ask) / 2;
    const dec = decimalsFor(def.group, def.symbol, mid);

    results.push({
      symbol: def.symbol,
      name: def.name,
      group: def.group,
      bid: Number(bid.toFixed(dec)),
      ask: Number(ask.toFixed(dec)),
      changePct: Number(changePct.toFixed(2)),
    });
  }

  return results;
}
