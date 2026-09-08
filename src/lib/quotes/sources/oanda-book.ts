import { classifyCrowd } from "@/lib/quotes/external-signal-classify";
import type { ExternalSignal, SourceOutcome } from "@/lib/quotes/signal-sources";

/**
 * OANDA v20 position book — tỷ lệ lệnh long/short đang mở của khách lẻ OANDA, cùng mức giá
 * lệnh tập trung dày nhất (vùng thanh khoản). Tín hiệu đi NGƯỢC đám đông ở vùng cực đoan.
 *
 * Cần env:
 *   OANDA_API_TOKEN  — Personal access token (tài khoản demo/practice là đủ, miễn phí)
 *   OANDA_API_URL    — mặc định https://api-fxpractice.oanda.com (live: https://api-fxtrade.oanda.com)
 */
const DEFAULT_BASE = "https://api-fxpractice.oanda.com";

const INSTRUMENT_MAP: Record<string, string> = {
  EURUSD: "EUR_USD",
  GBPUSD: "GBP_USD",
  USDJPY: "USD_JPY",
  AUDUSD: "AUD_USD",
  USDCAD: "USD_CAD",
  NZDUSD: "NZD_USD",
  USDCHF: "USD_CHF",
  EURGBP: "EUR_GBP",
  EURJPY: "EUR_JPY",
  GBPJPY: "GBP_JPY",
  XAUUSD: "XAU_USD",
  XAGUSD: "XAG_USD",
  USOIL: "WTICO_USD",
};

type Bucket = { price: string; longCountPercent: string; shortCountPercent: string };
type PositionBookResponse = { positionBook?: { buckets?: Bucket[] } };

export function summarizeBook(buckets: Bucket[]): {
  longPct: number;
  shortPct: number;
  heavyZone: number | null;
} | null {
  if (buckets.length === 0) return null;
  let longSum = 0;
  let shortSum = 0;
  let heavyZone: number | null = null;
  let heaviest = -1;

  for (const b of buckets) {
    const l = Number(b.longCountPercent);
    const s = Number(b.shortCountPercent);
    if (!Number.isFinite(l) || !Number.isFinite(s)) continue;
    longSum += l;
    shortSum += s;
    const density = l + s;
    if (density > heaviest) {
      heaviest = density;
      const price = Number(b.price);
      heavyZone = Number.isFinite(price) ? Math.round(price * 1e5) / 1e5 : null;
    }
  }

  const total = longSum + shortSum;
  if (total <= 0) return null;
  return {
    longPct: Math.round((longSum / total) * 1000) / 10,
    shortPct: Math.round((shortSum / total) * 1000) / 10,
    heavyZone: Number.isFinite(heavyZone ?? NaN) ? heavyZone : null,
  };
}

export async function fetchOandaBookSignals(): Promise<SourceOutcome> {
  const token = process.env.OANDA_API_TOKEN;
  if (!token) return { ok: false, reason: "OANDA_API_TOKEN chưa cấu hình" };
  const base = (process.env.OANDA_API_URL || DEFAULT_BASE).replace(/\/$/, "");

  const entries = Object.entries(INSTRUMENT_MAP);
  const signals: ExternalSignal[] = [];
  const errors: string[] = [];

  // Tuần tự, nhẹ nhàng — ~13 request/lần chạy, mỗi ngày 1 lần.
  for (const [symbol, instrument] of entries) {
    try {
      const res = await fetch(`${base}/v3/instruments/${instrument}/positionBook`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) {
        errors.push(`${instrument} HTTP ${res.status}`);
        continue;
      }
      const data = (await res.json()) as PositionBookResponse;
      const summary = summarizeBook(data.positionBook?.buckets ?? []);
      if (!summary) continue;
      const signal = classifyCrowd(summary.longPct);
      if (!signal) continue;
      signals.push({
        source: "oandaBook",
        symbol,
        signal,
        stance: "contrarian",
        detail: {
          kind: "crowd",
          longPct: summary.longPct,
          shortPct: summary.shortPct,
          heavyZone: summary.heavyZone,
        },
      });
    } catch (e) {
      errors.push(`${instrument}: ${e instanceof Error ? e.message : "fetch failed"}`);
    }
  }

  if (signals.length === 0 && errors.length === entries.length) {
    return { ok: false, reason: `OANDA: tất cả request lỗi (${errors[0]})` };
  }
  return { ok: true, signals };
}
