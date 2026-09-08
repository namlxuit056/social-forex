import { classifyCrowd } from "@/lib/quotes/external-signal-classify";
import type { ExternalSignal, SourceOutcome } from "@/lib/quotes/signal-sources";

/**
 * Myfxbook Community Outlook — % long/short tổng hợp từ tài khoản thật kết nối Myfxbook.
 * Tín hiệu đi NGƯỢC đám đông ở vùng cực đoan.
 *
 * Cần env: MYFXBOOK_EMAIL + MYFXBOOK_PASSWORD (tài khoản Myfxbook miễn phí).
 * API: login.json → session → get-community-outlook.json → logout.json
 */
const API = "https://www.myfxbook.com/api";

const SYMBOLS = new Set([
  "EURUSD",
  "GBPUSD",
  "USDJPY",
  "AUDUSD",
  "USDCAD",
  "NZDUSD",
  "USDCHF",
  "EURGBP",
  "EURJPY",
  "GBPJPY",
  "XAUUSD",
  "XAGUSD",
]);

type OutlookSymbol = {
  name?: string;
  longPercentage?: number | string;
  shortPercentage?: number | string;
};
type OutlookResponse = { error?: boolean; message?: string; symbols?: OutlookSymbol[] };

export function outlookToSignals(symbols: OutlookSymbol[]): ExternalSignal[] {
  const out: ExternalSignal[] = [];
  for (const s of symbols) {
    const symbol = (s.name ?? "").toUpperCase().replace(/[^A-Z]/g, "");
    if (!SYMBOLS.has(symbol)) continue;
    const longPct = Number(s.longPercentage);
    const shortPct = Number(s.shortPercentage);
    if (!Number.isFinite(longPct)) continue;
    const signal = classifyCrowd(longPct);
    if (!signal) continue;
    out.push({
      source: "myfxbook",
      symbol,
      signal,
      stance: "contrarian",
      detail: {
        kind: "crowd",
        longPct: Math.round(longPct * 10) / 10,
        shortPct: Number.isFinite(shortPct)
          ? Math.round(shortPct * 10) / 10
          : Math.round((100 - longPct) * 10) / 10,
      },
    });
  }
  return out;
}

export async function fetchMyfxbookSignals(): Promise<SourceOutcome> {
  const email = process.env.MYFXBOOK_EMAIL;
  const password = process.env.MYFXBOOK_PASSWORD;
  if (!email || !password) {
    return { ok: false, reason: "MYFXBOOK_EMAIL / MYFXBOOK_PASSWORD chưa cấu hình" };
  }

  let session: string | null = null;
  try {
    const loginRes = await fetch(
      `${API}/login.json?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
      { cache: "no-store" },
    );
    const loginData = (await loginRes.json()) as { error?: boolean; session?: string; message?: string };
    if (loginData.error || !loginData.session) {
      return { ok: false, reason: `Myfxbook login: ${loginData.message ?? "thất bại"}` };
    }
    session = loginData.session;

    const res = await fetch(
      `${API}/get-community-outlook.json?session=${encodeURIComponent(session)}`,
      { cache: "no-store" },
    );
    const data = (await res.json()) as OutlookResponse;
    if (data.error || !data.symbols) {
      return { ok: false, reason: `Myfxbook outlook: ${data.message ?? "không có dữ liệu"}` };
    }
    return { ok: true, signals: outlookToSignals(data.symbols) };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "Myfxbook fetch failed" };
  } finally {
    if (session) {
      await fetch(`${API}/logout.json?session=${encodeURIComponent(session)}`, {
        cache: "no-store",
      }).catch(() => {});
    }
  }
}
