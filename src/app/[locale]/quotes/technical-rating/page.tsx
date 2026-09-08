import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/layout/empty-state";
import { SignupPrompt } from "@/components/analytics/signup-prompt";
import {
  computeSourceScorecard,
  type OutcomeResult,
  type OutcomeRow,
} from "@/lib/quotes/signal-outcomes";
import { TechnicalRatingHistory } from "./technical-rating-history";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("quotes");
  return { title: t("technicalRatingTitle"), description: t("technicalRatingDescription") };
}

export const dynamic = "force-dynamic";

export default async function TechnicalRatingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("quotes");
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">
            {t("technicalRatingTitle")}
          </h1>
          <p className="mt-2 text-muted-foreground">{t("technicalRatingDescription")}</p>
        </div>
        <EmptyState
          title={t("technicalRatingTitle")}
          description={t("technicalRatingDescription")}
          primary={{
            href: "/auth/signin?callbackUrl=/quotes/technical-rating",
            label: t("technicalRatingTitle"),
          }}
        />
        <SignupPrompt
          surface="technical_rating"
          title={t("technicalRatingTitle")}
          description={t("technicalRatingDescription")}
          ctaLabel={t("technicalRatingTitle")}
        />
      </div>
    );
  }

  const scorecardSince = new Date(new Date().getTime() - 90 * 24 * 60 * 60 * 1000);
  const [rows, dailySummaryRows, outcomeRows] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.user.id, kind: "TECHNICAL_RATING_SIGNAL" },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.technicalRatingDailySummary.findMany({
      orderBy: { day: "desc" },
      take: 31,
    }),
    prisma.signalOutcome.findMany({
      where: { firedAt: { gte: scorecardSince } },
      select: { source: true, firedAt: true, result: true, favorPct: true },
      orderBy: { firedAt: "desc" },
      take: 3000,
    }),
  ]);

  const parsedOutcomes: OutcomeRow[] = outcomeRows.map((r) => ({
    source: r.source,
    firedAt: r.firedAt,
    result: (r.result as OutcomeResult | null) ?? null,
    favorPct: r.favorPct,
  }));
  const scorecards = {
    d30: computeSourceScorecard(parsedOutcomes, { windowDays: 30 }),
    d90: computeSourceScorecard(parsedOutcomes, { windowDays: 90 }),
  };

  const items = rows.map((n) => ({
    id: n.id,
    createdAt: n.createdAt.toISOString(),
    readAt: n.readAt?.toISOString() ?? null,
    meta: n.meta as {
      symbol?: string;
      signal?: string;
      source?: string;
      stance?: string;
      score4h?: number;
      score1d?: number;
      entryLow?: number;
      entryHigh?: number;
      stopLoss?: number;
      takeProfit?: number;
      tvAgree?: boolean | null;
      detail?: {
        kind?: string;
        longPct?: number;
        shortPct?: number;
        heavyZone?: number | null;
        netPct?: number;
        weekChange?: number;
        reportDate?: string;
      };
    } | null,
  }));

  const dailySummaries = dailySummaryRows.map((r) => ({
    day: r.day.toISOString().slice(0, 10),
    totalSignals: r.totalSignals,
    buySignals: r.buySignals,
    sellSignals: r.sellSignals,
    heldSignals: r.heldSignals,
    topSymbols: r.topSymbols as { symbol: string; count: number }[],
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          {t("technicalRatingTitle")}
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          {t("technicalRatingDescription")}
        </p>
      </div>
      <TechnicalRatingHistory
        items={items}
        dailySummaries={dailySummaries}
        scorecards={scorecards}
        locale={locale}
      />
    </div>
  );
}
