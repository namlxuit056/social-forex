import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/layout/empty-state";
import { SignupPrompt } from "@/components/analytics/signup-prompt";
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

  const [rows, dailySummaryRows] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.user.id, kind: "TECHNICAL_RATING_SIGNAL" },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.technicalRatingDailySummary.findMany({
      orderBy: { day: "desc" },
      take: 31,
    }),
  ]);

  const items = rows.map((n) => ({
    id: n.id,
    createdAt: n.createdAt.toISOString(),
    readAt: n.readAt?.toISOString() ?? null,
    meta: n.meta as {
      symbol?: string;
      signal?: string;
      score4h?: number;
      score1d?: number;
      entryLow?: number;
      entryHigh?: number;
      stopLoss?: number;
      takeProfit?: number;
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
      <TechnicalRatingHistory items={items} dailySummaries={dailySummaries} locale={locale} />
    </div>
  );
}
