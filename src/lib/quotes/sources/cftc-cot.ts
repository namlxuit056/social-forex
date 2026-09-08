import { classifyCot, crossSignal } from "@/lib/quotes/external-signal-classify";
import type { ExternalSignal, SourceOutcome } from "@/lib/quotes/signal-sources";

/**
 * CFTC Commitments of Traders — "Legacy, Futures Only" (Socrata dataset 6dca-aqww).
 * Public, không cần API key. Báo cáo ra chiều thứ Sáu hàng tuần (số liệu chốt thứ Ba).
 * Ta lấy vị thế ròng của nhóm non-commercial (quỹ đầu cơ lớn) cho các hợp đồng tiền tệ
 * CME + vàng/bạc/dầu, rồi ánh xạ sang cặp app hỗ trợ.
 */
const CFTC_URL = "https://publicreporting.cftc.gov/resource/6dca-aqww.json";

type CotCurrency = "EUR" | "GBP" | "JPY" | "CAD" | "AUD" | "CHF" | "NZD" | "GOLD" | "SILVER" | "WTI";

/** Khớp `market_and_exchange_names` (đã upper-case) → đồng/hàng hoá. Loại bỏ hợp đồng micro/e-mini. */
const MARKET_MATCHERS: { currency: CotCurrency; test: (name: string) => boolean }[] = [
  { currency: "EUR", test: (n) => n.startsWith("EURO FX - ") },
  { currency: "GBP", test: (n) => n.startsWith("BRITISH POUND") && !n.includes("MICRO") },
  { currency: "JPY", test: (n) => n.startsWith("JAPANESE YEN") && !n.includes("MICRO") },
  { currency: "CAD", test: (n) => n.startsWith("CANADIAN DOLLAR") && !n.includes("MICRO") },
  { currency: "AUD", test: (n) => n.startsWith("AUSTRALIAN DOLLAR") && !n.includes("MICRO") },
  { currency: "CHF", test: (n) => n.startsWith("SWISS FRANC") && !n.includes("MICRO") },
  { currency: "NZD", test: (n) => n.includes("NEW ZEALAND DOLLAR") || n.startsWith("NZ DOLLAR") },
  { currency: "GOLD", test: (n) => n.startsWith("GOLD - COMMODITY EXCHANGE") },
  { currency: "SILVER", test: (n) => n.startsWith("SILVER - COMMODITY EXCHANGE") },
  { currency: "WTI", test: (n) => n.startsWith("CRUDE OIL, LIGHT SWEET") },
];

/** Cặp trực tiếp vs USD → đồng cần tra + có phải nghịch đảo (long đồng đó ⇒ BÁN cặp) không. */
const DIRECT_PAIRS: Record<string, { currency: CotCurrency; invert: boolean }> = {
  EURUSD: { currency: "EUR", invert: false },
  GBPUSD: { currency: "GBP", invert: false },
  USDJPY: { currency: "JPY", invert: true },
  AUDUSD: { currency: "AUD", invert: false },
  USDCAD: { currency: "CAD", invert: true },
  NZDUSD: { currency: "NZD", invert: false },
  USDCHF: { currency: "CHF", invert: true },
  XAUUSD: { currency: "GOLD", invert: false },
  XAGUSD: { currency: "SILVER", invert: false },
  USOIL: { currency: "WTI", invert: false },
};

/** Cặp chéo → [đồng base, đồng quote]. */
const CROSS_PAIRS: Record<string, [CotCurrency, CotCurrency]> = {
  EURGBP: ["EUR", "GBP"],
  EURJPY: ["EUR", "JPY"],
  GBPJPY: ["GBP", "JPY"],
};

type CotRow = {
  market_and_exchange_names?: string;
  report_date_as_yyyy_mm_dd?: string;
  open_interest_all?: string;
  noncomm_positions_long_all?: string;
  noncomm_positions_short_all?: string;
  change_in_noncomm_long_all?: string;
  change_in_noncomm_short_all?: string;
};

type CurrencyState = {
  reportDate: string;
  netPct: number;
  weekChange: number;
  bias: "buy" | "sell" | null;
};

function num(v: string | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function parseCotRows(rows: CotRow[]): Map<CotCurrency, CurrencyState> {
  const latestByCurrency = new Map<CotCurrency, CotRow>();

  for (const row of rows) {
    const name = (row.market_and_exchange_names ?? "").toUpperCase();
    const matcher = MARKET_MATCHERS.find((m) => m.test(name));
    if (!matcher) continue;
    const existing = latestByCurrency.get(matcher.currency);
    if (
      !existing ||
      (row.report_date_as_yyyy_mm_dd ?? "") > (existing.report_date_as_yyyy_mm_dd ?? "")
    ) {
      latestByCurrency.set(matcher.currency, row);
    }
  }

  const out = new Map<CotCurrency, CurrencyState>();
  for (const [currency, row] of latestByCurrency) {
    const oi = num(row.open_interest_all);
    if (oi <= 0) continue;
    const long = num(row.noncomm_positions_long_all);
    const short = num(row.noncomm_positions_short_all);
    const weekChange =
      num(row.change_in_noncomm_long_all) - num(row.change_in_noncomm_short_all);
    const netPct = ((long - short) / oi) * 100;
    out.set(currency, {
      reportDate: (row.report_date_as_yyyy_mm_dd ?? "").slice(0, 10),
      netPct: Math.round(netPct * 10) / 10,
      weekChange: Math.round(weekChange),
      bias: classifyCot(netPct, weekChange),
    });
  }
  return out;
}

export async function fetchCotSignals(): Promise<SourceOutcome> {
  const twoWeeksAgo = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const url =
    `${CFTC_URL}?$select=market_and_exchange_names,report_date_as_yyyy_mm_dd,open_interest_all,` +
    `noncomm_positions_long_all,noncomm_positions_short_all,change_in_noncomm_long_all,` +
    `change_in_noncomm_short_all&$where=report_date_as_yyyy_mm_dd>'${twoWeeksAgo}T00:00:00'` +
    `&$order=report_date_as_yyyy_mm_dd DESC&$limit=2000`;

  let rows: CotRow[];
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return { ok: false, reason: `CFTC HTTP ${res.status}` };
    rows = (await res.json()) as CotRow[];
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "CFTC fetch failed" };
  }

  const states = parseCotRows(rows);
  if (states.size === 0) return { ok: false, reason: "CFTC: không khớp được hợp đồng nào" };

  const signals: ExternalSignal[] = [];

  for (const [symbol, { currency, invert }] of Object.entries(DIRECT_PAIRS)) {
    const state = states.get(currency);
    if (!state?.bias) continue;
    const signal = invert ? (state.bias === "buy" ? "sell" : "buy") : state.bias;
    signals.push({
      source: "cot",
      symbol,
      signal,
      stance: "trend",
      detail: {
        kind: "cot",
        netPct: state.netPct,
        weekChange: state.weekChange,
        reportDate: state.reportDate,
      },
    });
  }

  for (const [symbol, [base, quote]] of Object.entries(CROSS_PAIRS)) {
    const baseState = states.get(base);
    const quoteState = states.get(quote);
    if (!baseState || !quoteState) continue;
    const signal = crossSignal(baseState.bias, quoteState.bias);
    if (!signal) continue;
    // Vị thế ròng của cặp chéo = chênh lệch net% hai đồng.
    const netPct = Math.round((baseState.netPct - quoteState.netPct) * 10) / 10;
    signals.push({
      source: "cot",
      symbol,
      signal,
      stance: "trend",
      detail: {
        kind: "cot",
        netPct,
        weekChange: baseState.weekChange - quoteState.weekChange,
        reportDate:
          baseState.reportDate > quoteState.reportDate
            ? baseState.reportDate
            : quoteState.reportDate,
      },
    });
  }

  return { ok: true, signals };
}
