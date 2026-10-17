import { createTranslator } from "next-intl";
import { prisma } from "@/lib/prisma";
import { isPushEnabled, sendPushToUser } from "@/lib/push";
import { fetchTechnicalRatings } from "@/lib/quotes/fetch-tv-ratings";
import { buildExternalPush } from "@/lib/quotes/external-signal-format";
import { currentMidPrices, recordSignalOutcome } from "@/lib/quotes/signal-outcome-store";
import { fetchCotSignals } from "@/lib/quotes/sources/cftc-cot";
import { fetchOandaBookSignals } from "@/lib/quotes/sources/oanda-book";
import { fetchMyfxbookSignals } from "@/lib/quotes/sources/myfxbook-outlook";
import { fetchIgDailyFxSignals } from "@/lib/quotes/sources/ig-dailyfx-sentiment";
import type {
  ExternalSignal,
  ExternalSignalMeta,
  SourceOutcome,
} from "@/lib/quotes/signal-sources";
import viMessages from "../../../messages/vi.json";
import enMessages from "../../../messages/en.json";
import { technicalRatingSignalHref } from "@/lib/quotes/technical-rating-link";

type SourceKey = ExternalSignal["source"];

const DAILY_SOURCES: SourceKey[] = ["oandaBook", "myfxbook", "igDailyfx"];
const WEEKLY_SOURCES: SourceKey[] = ["cot"];

const FETCHERS: Record<SourceKey, () => Promise<SourceOutcome>> = {
  cot: fetchCotSignals,
  oandaBook: fetchOandaBookSignals,
  myfxbook: fetchMyfxbookSignals,
  igDailyfx: fetchIgDailyFxSignals,
};

const DAY_MS = 24 * 60 * 60 * 1000;

function dedupeKey(sig: ExternalSignal): string {
  if (sig.detail.kind === "cot") {
    return `extsig:cot:${sig.symbol}:${sig.signal}:${sig.detail.reportDate}`;
  }
  const dayBucket = Math.floor(Date.now() / DAY_MS);
  return `extsig:${sig.source}:${sig.symbol}:${sig.signal}:${dayBucket}`;
}

function localizedPush(locale: string | null | undefined, meta: ExternalSignalMeta) {
  const resolved = locale === "en" ? "en" : "vi";
  const raw = createTranslator({
    locale: resolved,
    messages: resolved === "en" ? enMessages : viMessages,
    namespace: "signalSources",
  });
  const t = (key: string, params?: Record<string, string | number>) =>
    raw(key as Parameters<typeof raw>[0], params as never);
  return buildExternalPush(t, meta);
}

async function broadcast(
  sig: ExternalSignal,
  tvAgree: boolean | null,
  entryPrice: number | undefined,
): Promise<{ notified: number; skipped: boolean }> {
  const key = dedupeKey(sig);

  // Đã phát sự kiện này rồi (bất kỳ user nào có dòng dedupeKey) → bỏ qua để không lặp.
  const already = await prisma.notification.findFirst({
    where: { kind: "TECHNICAL_RATING_SIGNAL", dedupeKey: key },
    select: { id: true },
  });
  if (already) return { notified: 0, skipped: true };

  const users = await prisma.user.findMany({ select: { id: true, locale: true } });
  if (users.length === 0) return { notified: 0, skipped: false };

  const meta: ExternalSignalMeta = {
    source: sig.source,
    symbol: sig.symbol,
    signal: sig.signal,
    stance: sig.stance,
    detail: sig.detail,
    tvAgree,
  };

  await prisma.$transaction(
    users.map((u) =>
      prisma.notification.upsert({
        where: { userId_dedupeKey: { userId: u.id, dedupeKey: key } },
        create: { userId: u.id, kind: "TECHNICAL_RATING_SIGNAL", dedupeKey: key, meta },
        update: {},
      }),
    ),
  );

  if (entryPrice !== undefined) {
    await recordSignalOutcome({
      dedupeKey: key,
      source: sig.source,
      symbol: sig.symbol,
      signal: sig.signal,
      stance: sig.stance,
      firedAt: new Date(),
      entryPrice,
    });
  }

  if (isPushEnabled()) {
    // Build payload 1 lần / locale.
    const payloadByLocale = new Map<string, { title: string; body: string; url: string }>();
    await Promise.all(
      users.map(async (u) => {
        const loc = u.locale === "en" ? "en" : "vi";
        let payload = payloadByLocale.get(loc);
        if (!payload) {
          const built = localizedPush(loc, meta);
          payload = { ...built, url: technicalRatingSignalHref(key) };
          payloadByLocale.set(loc, payload);
        }
        try {
          await sendPushToUser(u.id, payload);
        } catch {
          // Non-blocking
        }
      }),
    );
  }

  return { notified: users.length, skipped: false };
}

export type ExternalSignalsRunSummary = {
  ok: true;
  mode: "daily" | "weekly" | "all";
  ranAt: string;
  perSource: Record<string, { ok: boolean; signals?: number; reason?: string }>;
  fired: {
    source: SourceKey;
    symbol: string;
    signal: "buy" | "sell";
    tvAgree: boolean | null;
    notified: number;
    skipped: boolean;
  }[];
  totalNotified: number;
};

/**
 * Quét các nguồn tín hiệu ngoài TradingView và broadcast notification cho toàn bộ user
 * (kind TECHNICAL_RATING_SIGNAL, meta.source ghi rõ nguồn). Chạy từ 2 cron:
 *  - external-signals-check (hàng ngày): oandaBook, myfxbook, igDailyfx
 *  - cot-check (hàng tuần, sau khi CFTC ra báo cáo): cot
 */
export async function runExternalSignals(
  mode: "daily" | "weekly" | "all" = "daily",
): Promise<ExternalSignalsRunSummary> {
  const sources =
    mode === "all"
      ? [...WEEKLY_SOURCES, ...DAILY_SOURCES]
      : mode === "weekly"
        ? WEEKLY_SOURCES
        : DAILY_SOURCES;

  // Điểm kỹ thuật 4H hiện tại của TradingView để đối chiếu (không bắt buộc).
  let tvScore4h = new Map<string, number>();
  try {
    const ratings = await fetchTechnicalRatings();
    tvScore4h = new Map([...ratings.entries()].map(([s, v]) => [s, v.score4h]));
  } catch {
    // bỏ qua — tvAgree sẽ là null
  }

  // Giá spot lúc phát — làm mốc chấm kết quả sau này (bảng điểm độ chính xác theo nguồn).
  const midPrices = await currentMidPrices();

  const perSource: ExternalSignalsRunSummary["perSource"] = {};
  const fired: ExternalSignalsRunSummary["fired"] = [];
  let totalNotified = 0;

  for (const source of sources) {
    let outcome: SourceOutcome;
    try {
      outcome = await FETCHERS[source]();
    } catch (e) {
      outcome = { ok: false, reason: e instanceof Error ? e.message : "lỗi không xác định" };
    }

    if (!outcome.ok) {
      perSource[source] = { ok: false, reason: outcome.reason };
      continue;
    }
    perSource[source] = { ok: true, signals: outcome.signals.length };

    for (const sig of outcome.signals) {
      const score = tvScore4h.get(sig.symbol);
      const tvAgree =
        score === undefined || score === 0
          ? null
          : (score > 0) === (sig.signal === "buy");

      try {
        const { notified, skipped } = await broadcast(sig, tvAgree, midPrices.get(sig.symbol));
        totalNotified += notified;
        fired.push({
          source: sig.source,
          symbol: sig.symbol,
          signal: sig.signal,
          tvAgree,
          notified,
          skipped,
        });
      } catch (e) {
        console.error("[external-signals] broadcast failed", sig.source, sig.symbol, e);
      }
    }
  }

  return {
    ok: true,
    mode,
    ranAt: new Date().toISOString(),
    perSource,
    fired,
    totalNotified,
  };
}
