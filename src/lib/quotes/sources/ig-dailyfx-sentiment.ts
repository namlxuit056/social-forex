import { classifyCrowd } from "@/lib/quotes/external-signal-classify";
import type { ExternalSignal, SourceOutcome } from "@/lib/quotes/signal-sources";

/**
 * IG Client Sentiment (retail long/short %) công bố qua DailyFX. Đây là chỉ báo ngược
 * chiều đám đông kinh điển của IG.
 *
 * Nguồn dữ liệu, ưu tiên từ trên xuống:
 *   1. env IG_SENTIMENT_URL — URL trả JSON do bạn tự trỏ (ổn định nhất, không lo Cloudflare)
 *   2. DailyFX widget JSON công khai (best-effort, có thể bị chặn/đổi cấu trúc)
 *
 * JSON kỳ vọng: mảng hoặc object các mục có tên cặp + % long (nhiều tên trường được chấp nhận).
 */
const DAILYFX_WIDGET_URL =
  "https://www.dailyfx.com/api/v1/dfx-sentiment/get-sentiment-widget-data";

const PAIR_ALIASES: Record<string, string> = {
  EURUSD: "EURUSD",
  GBPUSD: "GBPUSD",
  USDJPY: "USDJPY",
  AUDUSD: "AUDUSD",
  USDCAD: "USDCAD",
  NZDUSD: "NZDUSD",
  USDCHF: "USDCHF",
  EURGBP: "EURGBP",
  EURJPY: "EURJPY",
  GBPJPY: "GBPJPY",
  XAUUSD: "XAUUSD",
  GOLD: "XAUUSD",
  SPOTGOLD: "XAUUSD",
  XAGUSD: "XAGUSD",
  SILVER: "XAGUSD",
  USOIL: "USOIL",
  OILUSCRUDE: "USOIL",
  CRUDEOIL: "USOIL",
  WTI: "USOIL",
};

const LONG_KEYS = [
  "longPercent",
  "longPositionPercent",
  "longPositionPercentage",
  "long",
  "percentLong",
  "longPercentage",
];

function normPair(raw: string): string | null {
  const key = raw.toUpperCase().replace(/[^A-Z]/g, "");
  return PAIR_ALIASES[key] ?? null;
}

function readLongPct(obj: Record<string, unknown>): number | null {
  for (const k of LONG_KEYS) {
    const v = obj[k];
    const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
    if (Number.isFinite(n)) return n > 1 ? n : n * 100; // chấp nhận cả 0..1 và 0..100
  }
  return null;
}

/** Đi đệ quy tìm các mục { <tên cặp>, <% long> } trong payload JSON bất kỳ. */
export function parseDailyFxSentiment(payload: unknown): Map<string, number> {
  const found = new Map<string, number>();
  const seen = new Set<unknown>();

  const walk = (node: unknown, depth: number) => {
    if (!node || typeof node !== "object" || depth > 8 || seen.has(node)) return;
    seen.add(node);

    if (Array.isArray(node)) {
      for (const item of node) walk(item, depth + 1);
      return;
    }

    const obj = node as Record<string, unknown>;
    const pairRaw =
      (typeof obj.symbol === "string" && obj.symbol) ||
      (typeof obj.pair === "string" && obj.pair) ||
      (typeof obj.market === "string" && obj.market) ||
      (typeof obj.name === "string" && obj.name) ||
      (typeof obj.ticker === "string" && obj.ticker) ||
      "";
    if (pairRaw) {
      const pair = normPair(pairRaw);
      const longPct = readLongPct(obj);
      if (pair && longPct !== null && !found.has(pair)) {
        found.set(pair, Math.round(longPct * 10) / 10);
      }
    }

    for (const value of Object.values(obj)) walk(value, depth + 1);
  };

  walk(payload, 0);
  return found;
}

export async function fetchIgDailyFxSignals(): Promise<SourceOutcome> {
  const url = process.env.IG_SENTIMENT_URL || DAILYFX_WIDGET_URL;

  let payload: unknown;
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "application/json,text/plain,*/*",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
      },
    });
    if (!res.ok) return { ok: false, reason: `IG/DailyFX HTTP ${res.status}` };
    const text = await res.text();
    try {
      payload = JSON.parse(text);
    } catch {
      // Trang HTML — thử moi khối JSON đầu tiên trông giống dữ liệu sentiment.
      const match = text.match(/\{[^{}]*"(?:longPercent|longPositionPercent)"[\s\S]*?\}/);
      if (!match) return { ok: false, reason: "IG/DailyFX: không parse được JSON" };
      payload = JSON.parse(`[${match[0]}]`);
    }
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "IG/DailyFX fetch failed" };
  }

  const byPair = parseDailyFxSentiment(payload);
  if (byPair.size === 0) return { ok: false, reason: "IG/DailyFX: không tìm thấy cặp nào" };

  const signals: ExternalSignal[] = [];
  for (const [symbol, longPct] of byPair) {
    const signal = classifyCrowd(longPct);
    if (!signal) continue;
    signals.push({
      source: "igDailyfx",
      symbol,
      signal,
      stance: "contrarian",
      detail: {
        kind: "crowd",
        longPct,
        shortPct: Math.round((100 - longPct) * 10) / 10,
      },
    });
  }
  return { ok: true, signals };
}
