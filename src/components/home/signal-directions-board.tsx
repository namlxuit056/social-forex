import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import {
  latestTvSignals,
  signalValidity,
  type SignalValidity,
} from "@/lib/quotes/recent-signal-directions";
import { getCachedTechnicalRatings } from "@/lib/quotes/tv-ratings-cache";
import {
  computeSymbolScorecard,
  type OutcomeResult,
  type SymbolOutcomeRow,
} from "@/lib/quotes/signal-outcomes";
import { cn } from "@/lib/utils";

const WINDOW_DAYS = 7;
const TRACK_RECORD_WINDOW_DAYS = 30;

function fmt(n: number | null): string {
  return n === null ? "—" : n.toLocaleString("en-US", { maximumFractionDigits: 5 });
}

const VALIDITY_CLASS: Record<SignalValidity, string> = {
  holding: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  reversing: "bg-red-500/12 text-red-700 dark:text-red-300",
  unclear: "bg-muted text-muted-foreground",
};

const VALIDITY_KEY = {
  holding: "signalBoardValidityHolding",
  reversing: "signalBoardValidityReversing",
  unclear: "signalBoardValidityUnclear",
} as const;

export async function SignalDirectionsBoard({
  locale,
  nowIso,
}: {
  locale: string;
  nowIso: string;
}) {
  const t = await getTranslations("home");
  const ts = await getTranslations("signalSources");

  const now = new Date(nowIso).getTime();
  const since = new Date(now - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  // dedupeKey đứng đầu orderBy để Prisma đẩy `DISTINCT ON (dedupeKey)` xuống SQL —
  // notification broadcast cho mọi user nên mỗi tín hiệu có rất nhiều dòng trùng key;
  // `latestTvSignals` sắp lại theo thời gian sau.
  const rows = await prisma.notification.findMany({
    where: {
      kind: "TECHNICAL_RATING_SIGNAL",
      createdAt: { gte: since },
      meta: { path: ["source"], equals: "tradingview" },
    },
    orderBy: [{ dedupeKey: "asc" }, { createdAt: "desc" }],
    distinct: ["dedupeKey"],
    take: 300,
    select: { dedupeKey: true, createdAt: true, meta: true },
  });

  const signals = latestTvSignals(rows);
  if (signals.length === 0) return null;

  // Giờ hiển thị: GMT+7 cho vi, UTC cho en (theo quy ước market-volatility-note).
  const displayTz = locale === "en" ? "UTC" : "Asia/Ho_Chi_Minh";

  // Tra lại điểm kỹ thuật 4H hiện tại trên TradingView để biết tín hiệu còn được ủng hộ không.
  const ratings = await getCachedTechnicalRatings();

  // Track record 30 ngày mỗi cặp — cùng dữ liệu SignalOutcome đã chấm cho scorecard trên
  // /quotes/technical-rating (recordSignalOutcome ghi 1:1 với mọi notification hiển thị ở đây).
  const trackRecordSince = new Date(now - TRACK_RECORD_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const outcomeRows = await prisma.signalOutcome.findMany({
    where: {
      source: "tradingview",
      symbol: { in: signals.map((s) => s.symbol) },
      firedAt: { gte: trackRecordSince },
    },
    select: { symbol: true, firedAt: true, result: true, favorPct: true },
  });
  const symbolRows: SymbolOutcomeRow[] = outcomeRows.map((r) => ({
    symbol: r.symbol,
    source: "tradingview",
    firedAt: r.firedAt,
    result: r.result as OutcomeResult | null,
    favorPct: r.favorPct,
  }));
  const trackRecord = computeSymbolScorecard(symbolRows, {
    now: new Date(now),
    windowDays: TRACK_RECORD_WINDOW_DAYS,
  });

  return (
    <section
      aria-labelledby="signal-directions-heading"
      className="rounded-2xl border border-border bg-card p-5 sm:p-6"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2
            id="signal-directions-heading"
            className="font-heading text-xl font-semibold tracking-tight text-foreground"
          >
            {t("signalBoardTitle")}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {t("signalBoardDesc", { days: WINDOW_DAYS })}
          </p>
        </div>
        <Link
          href="/quotes/technical-rating"
          className="flex shrink-0 items-center gap-1 text-sm text-primary hover:underline"
        >
          {t("signalBoardViewAll")}
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-200 border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-2 pr-3 font-medium">{t("signalBoardColPair")}</th>
              <th className="py-2 pr-3 font-medium">{t("signalBoardColBias")}</th>
              <th className="py-2 pr-3 text-right font-medium">{t("signalBoardColBestEntry")}</th>
              <th className="py-2 pr-3 text-right font-medium">{t("signalBoardColEntry")}</th>
              <th className="py-2 pr-3 text-right font-medium">{t("signalBoardColStop")}</th>
              <th className="py-2 pr-3 text-right font-medium">{t("signalBoardColTarget")}</th>
              <th className="py-2 pr-3 font-medium">{t("signalBoardColValidity")}</th>
              <th className="py-2 pr-3 font-medium">
                {t("signalBoardColTrackRecord", { days: TRACK_RECORD_WINDOW_DAYS })}
              </th>
              <th className="py-2 font-medium">{t("signalBoardColUpdated")}</th>
            </tr>
          </thead>
          <tbody>
            {signals.map((s) => {
              const isBuy = s.signal === "buy";
              const validity = signalValidity(s.signal, ratings.get(s.symbol)?.score4h);
              return (
                <tr key={s.symbol} className="border-b border-border last:border-0">
                  <td className="py-2.5 pr-3 align-top">
                    <span className="font-mono font-medium text-foreground">{s.symbol}</span>
                    {s.score4h !== null && s.score1d !== null ? (
                      <span className="ml-2 font-mono text-xs text-muted-foreground">
                        4H {s.score4h} · 1D {s.score1d}
                      </span>
                    ) : null}
                  </td>
                  <td className="py-2.5 pr-3 align-top">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold",
                        isBuy
                          ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
                          : "bg-red-500/12 text-red-700 dark:text-red-300",
                      )}
                    >
                      {isBuy ? (
                        <TrendingUp className="size-3.5" aria-hidden />
                      ) : (
                        <TrendingDown className="size-3.5" aria-hidden />
                      )}
                      {isBuy ? ts("buy") : ts("sell")}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 text-right align-top font-mono text-xs font-semibold text-foreground">
                    {fmt(s.bestEntry)}
                  </td>
                  <td className="py-2.5 pr-3 text-right align-top font-mono text-xs text-foreground/70">
                    {s.entryLow !== null && s.entryHigh !== null
                      ? `${fmt(s.entryLow)}–${fmt(s.entryHigh)}`
                      : "—"}
                  </td>
                  <td className="py-2.5 pr-3 text-right align-top font-mono text-xs text-red-600 dark:text-red-300">
                    {fmt(s.stopLoss)}
                  </td>
                  <td className="py-2.5 pr-3 text-right align-top font-mono text-xs text-emerald-600 dark:text-emerald-300">
                    {fmt(s.takeProfit)}
                  </td>
                  <td className="py-2.5 pr-3 align-top">
                    <span
                      className={cn(
                        "inline-flex rounded px-2 py-0.5 text-xs font-medium",
                        VALIDITY_CLASS[validity],
                      )}
                    >
                      {t(VALIDITY_KEY[validity])}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 align-top">
                    {(() => {
                      const score = trackRecord.get(s.symbol);
                      const decided = (score?.wins ?? 0) + (score?.losses ?? 0);
                      if (!score || decided === 0) {
                        return (
                          <span className="text-xs text-muted-foreground">
                            {score && score.pending > 0
                              ? t("signalBoardTrackRecordPending", { count: score.pending })
                              : t("signalBoardTrackRecordNoData")}
                          </span>
                        );
                      }
                      return (
                        <span className="inline-flex items-baseline gap-1 text-xs">
                          <span
                            className={cn(
                              "font-mono font-semibold",
                              score.winRate! >= 0.5
                                ? "text-emerald-600 dark:text-emerald-300"
                                : "text-red-600 dark:text-red-300",
                            )}
                          >
                            {Math.round(score.winRate! * 100)}%
                          </span>
                          <span className="text-muted-foreground">({decided})</span>
                        </span>
                      );
                    })()}
                  </td>
                  <td className="py-2.5 align-top text-xs text-muted-foreground">
                    {s.at.toLocaleString(locale, {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: displayTz,
                    })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">{t("signalBoardHint")}</p>
    </section>
  );
}
