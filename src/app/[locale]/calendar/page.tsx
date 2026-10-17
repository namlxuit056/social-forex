import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { auth } from "@/auth";
import { SignupPrompt } from "@/components/analytics/signup-prompt";
import { EconomicCalendar } from "@/components/calendar/economic-calendar";
import { PageCtaRow } from "@/components/layout/page-cta-row";
import { parseCalendarCurrencySearchParams } from "@/lib/calendar/parse-currency-search-params";
import { resolveCalendarEvents } from "@/lib/calendar/resolve-calendar";
import { pageCtaItems } from "@/lib/page-cta-i18n";
import { absoluteUrl } from "@/lib/site-url";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("calendar");
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: absoluteUrl("/calendar", locale) },
  };
}

export const dynamic = "force-dynamic";

export default async function CalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ currencies?: string; currency?: string; highlight?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("calendar");
  const tCommon = await getTranslations("common");
  const [cal, session] = await Promise.all([resolveCalendarEvents(), auth()]);

  const initialCurrencies = parseCalendarCurrencySearchParams(sp);
  const initialHighlightEventId = sp.highlight?.trim() || undefined;
  const calendarFilterKey =
    (initialCurrencies.length > 0 ? [...initialCurrencies].sort().join(",") : "all") +
    (initialHighlightEventId ? `:${initialHighlightEventId}` : "");

  const warningText =
    cal.warning &&
    (cal.warning.detail
      ? t(`warnings.${cal.warning.key}`, { message: cal.warning.detail })
      : t(`warnings.${cal.warning.key}`));

  const ctaRow = await pageCtaItems("trading", "explore");

  return (
    <div className="space-y-8">
      <PageHeader title={t("title")} description={t("description")} />
      <EconomicCalendar
        key={calendarFilterKey}
        events={cal.events}
        source={cal.source}
        warning={warningText ?? undefined}
        syncedAt={cal.syncedAt}
        serverNowIso={new Date().toISOString()}
        initialSelectedCurrencies={initialCurrencies}
        initialHighlightEventId={initialHighlightEventId}
      />
      {!session?.user?.id ? (
        <SignupPrompt
          surface="calendar_reminders"
          title={t("signupPromptTitle")}
          description={t("signupPromptDesc")}
          ctaLabel={t("signupPromptCta")}
        />
      ) : null}
      <PageCtaRow heading={tCommon("ctaDiscovery")} items={ctaRow} />
    </div>
  );
}
