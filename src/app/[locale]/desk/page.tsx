import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { localeAlternates } from "@/lib/site-url";
import { Link } from "@/i18n/navigation";
import { ChartContainer } from "@/components/charts/chart-container";
import { EconomicCalendar } from "@/components/calendar/economic-calendar";
import { PreTradeDesk } from "@/components/desk/pre-trade-desk";
import { DeskOrderTicket, type DeskOrderTicketState } from "@/components/desk/desk-order-ticket";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { Disclaimer } from "@/components/layout/disclaimer";
import { PageCtaRow } from "@/components/layout/page-cta-row";
import { LiveQuotesTable } from "@/components/quotes/live-quotes-table";
import {
  getNewsContextHours,
  getNewsContextWindow,
  getUpcomingHighAndMediumImpactEvents,
} from "@/lib/calendar/news-context-db";
import { parseCalendarCurrencySearchParams } from "@/lib/calendar/parse-currency-search-params";
import { resolveCalendarEvents } from "@/lib/calendar/resolve-calendar";
import { pageCtaItems } from "@/lib/page-cta-i18n";
import { resolveQuotes } from "@/lib/quotes/resolve-quotes";
import { symbolToCurrencies } from "@/lib/signals/symbol-currencies";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("desk");
  return { title: t("metaTitle"), description: t("metaDescription"), alternates: localeAlternates("/desk", locale) };
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

  const session = await auth();
  const userId = session?.user?.id;
  const [initialQuotes, cal, mt5Connection] = await Promise.all([
    resolveQuotes(),
    resolveCalendarEvents(),
    userId
      ? prisma.mt5Connection.findFirst({ where: { userId, revokedAt: null }, select: { id: true } })
      : null,
  ]);
  const orderTicketState: DeskOrderTicketState = !userId
    ? "signedOut"
    : mt5Connection
      ? "ready"
      : "noConnection";
  const newsContextHours = getNewsContextHours();
  const newsWindow = getNewsContextWindow();
  const deskCurrencies = new Set<string>();
  for (const quote of initialQuotes.quotes) {
    for (const currency of symbolToCurrencies(quote.symbol)) {
      deskCurrencies.add(currency);
    }
  }
  const deskNewsRows =
    deskCurrencies.size > 0
      ? await getUpcomingHighAndMediumImpactEvents({
          currencies: [...deskCurrencies],
          from: newsWindow.from,
          to: newsWindow.to,
          limit: 80,
        })
      : [];
  const deskNewsEvents = deskNewsRows.map((event) => ({
    id: event.id,
    timeUtc: event.timeUtc.toISOString(),
    currency: event.currency,
    title: event.title,
    impact: event.impact,
  }));

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
    <div className="space-y-10">
      <PageHeader title={t("title")} description={t("subtitle")}>
        <nav
          className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-primary"
          aria-label={t("jumpNavAria")}
        >
          <a
            href="#pre-trade-desk-title"
            className="inline-flex min-h-6 items-center underline-offset-4 hover:underline"
          >
            {t("jumpPreTrade")}
          </a>
          <a href="#desk-order" className="inline-flex min-h-6 items-center underline-offset-4 hover:underline">
            {t("jumpOrder")}
          </a>
          <a href="#desk-quotes" className="inline-flex min-h-6 items-center underline-offset-4 hover:underline">
            {t("jumpQuotes")}
          </a>
          <a
            href="#desk-calendar"
            className="inline-flex min-h-6 items-center underline-offset-4 hover:underline"
          >
            {t("jumpCalendar")}
          </a>
        </nav>
      </PageHeader>

      <PreTradeDesk
        quotes={initialQuotes.quotes}
        newsEvents={deskNewsEvents}
        newsContextHours={newsContextHours}
        chart={
          <Suspense>
            <ChartContainer locale={locale} showAiPanel={false} />
          </Suspense>
        }
      />

      <Suspense>
        <DeskOrderTicket state={orderTicketState} />
      </Suspense>

      <section id="desk-quotes" className="scroll-mt-24 space-y-4">
        <div className="flex flex-col gap-1 border-b border-border pb-2 sm:flex-row sm:items-end sm:justify-between">
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
        <div className="flex flex-col gap-1 border-b border-border pb-2 sm:flex-row sm:items-end sm:justify-between">
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


      <Disclaimer variant="compact" />
      <PageCtaRow heading={tCommon("ctaDiscovery")} items={ctaRow} />
    </div>
  );
}
