import { getTranslations, setRequestLocale } from "next-intl/server";
import { EconomicCalendar } from "@/components/calendar/economic-calendar";
import { PageCtaRow } from "@/components/layout/page-cta-row";
import { resolveCalendarEvents } from "@/lib/calendar/resolve-calendar";
import { pageCtas } from "@/lib/page-cta-presets";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("calendar");
  return { title: t("title"), description: t("description") };
}

export const dynamic = "force-dynamic";

export default async function CalendarPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("calendar");
  const cal = await resolveCalendarEvents();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          {t("title")}
        </h1>
        <p className="mt-2 text-muted-foreground">{t("description")}</p>
      </div>
      <EconomicCalendar
        events={cal.events}
        source={cal.source}
        warning={cal.warning}
        syncedAt={cal.syncedAt}
      />
      <PageCtaRow heading="→" items={[...pageCtas.trading, ...pageCtas.explore]} />
    </div>
  );
}
