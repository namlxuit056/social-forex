import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ChartContainer } from "@/components/charts/chart-container";
import { EconomicCalendar } from "@/components/calendar/economic-calendar";
import { Disclaimer } from "@/components/layout/disclaimer";
import { PageCtaRow } from "@/components/layout/page-cta-row";
import { LiveQuotesTable } from "@/components/quotes/live-quotes-table";
import { parseCalendarCurrencySearchParams } from "@/lib/calendar/parse-currency-search-params";
import { resolveCalendarEvents } from "@/lib/calendar/resolve-calendar";
import { pageCtaItems } from "@/lib/page-cta-i18n";
import { resolveQuotes } from "@/lib/quotes/resolve-quotes";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("desk");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function DeskPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ currencies?: string; currency?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("desk");
  const tQuotes = await getTranslations("quotes");
  const tCal = await getTranslations("calendar");
  const tCommon = await getTranslations("common");

  const [initialQuotes, cal] = await Promise.all([
    resolveQuotes(),
    resolveCalendarEvents(),
  ]);

  const initialWarning =
    initialQuotes.warningKey === "mockData"
      ? tQuotes("warningMock")
      : initialQuotes.warningKey === "providerFallback" &&
          initialQuotes.warningParams
        ? tQuotes("warningFallback", initialQuotes.warningParams)
        : undefined;

  const initialCurrencies = parseCalendarCurrencySearchParams(sp);
  const calendarFilterKey =
    initialCurrencies.length > 0
      ? [...initialCurrencies].sort().join(",")
      : "all";

  const calendarWarningText =
    cal.warning &&
    (cal.warning.detail
      ? tCal(`warnings.${cal.warning.key}`, { message: cal.warning.detail })
      : tCal(`warnings.${cal.warning.key}`));

  const ctaRow = await pageCtaItems("explore", "community");

  return (
    <div className="space-y-12">
      <header className="space-y-3">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          {t("title")}
        </h1>
        <p className="max-w-3xl text-muted-foreground">{t("subtitle")}</p>
        <nav
          className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-primary"
          aria-label={t("jumpNavAria")}
        >
          <a href="#desk-quotes" className="underline-offset-4 hover:underline">
            {t("jumpQuotes")}
          </a>
          <a
            href="#desk-calendar"
            className="underline-offset-4 hover:underline"
          >
            {t("jumpCalendar")}
          </a>
          <a href="#desk-chart" className="underline-offset-4 hover:underline">
            {t("jumpChart")}
          </a>
        </nav>
      </header>

      <section id="desk-quotes" className="scroll-mt-24 space-y-4">
        <div className="flex flex-col gap-1 border-b border-border/60 pb-2 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="font-heading text-lg font-medium text-foreground">
            {t("sectionQuotes")}
          </h2>
          <Link
            href="/quotes"
            className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
          >
            {t("openFullPage")}
          </Link>
        </div>
        <LiveQuotesTable
          initial={initialQuotes.quotes}
          initialSource={initialQuotes.source}
          initialWarning={initialWarning}
          initialUpdatedAt={initialQuotes.updatedAt}
        />
      </section>

      <section id="desk-calendar" className="scroll-mt-24 space-y-4">
        <div className="flex flex-col gap-1 border-b border-border/60 pb-2 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="font-heading text-lg font-medium text-foreground">
            {t("sectionCalendar")}
          </h2>
          <Link
            href="/calendar"
            className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
          >
            {t("openFullPage")}
          </Link>
        </div>
        <EconomicCalendar
          key={calendarFilterKey}
          events={cal.events}
          source={cal.source}
          warning={calendarWarningText ?? undefined}
          syncedAt={cal.syncedAt}
          serverNowIso={new Date().toISOString()}
          initialSelectedCurrencies={initialCurrencies}
        />
      </section>

      <section id="desk-chart" className="scroll-mt-24 space-y-4">
        <div className="flex flex-col gap-1 border-b border-border/60 pb-2 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="font-heading text-lg font-medium text-foreground">
            {t("sectionChart")}
          </h2>
          <Link
            href="/chart"
            className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
          >
            {t("openFullPage")}
          </Link>
        </div>
        <Suspense>
          <ChartContainer locale={locale} showAiPanel={false} />
        </Suspense>
      </section>

      <Disclaimer variant="compact" />
      <PageCtaRow heading={tCommon("ctaDiscovery")} items={ctaRow} />
    </div>
  );
}
