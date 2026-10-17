import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { localeAlternates } from "@/lib/site-url";
import { LiveQuotesTable } from "@/components/quotes/live-quotes-table";
import { PageCtaRow } from "@/components/layout/page-cta-row";
import { pageCtaItems } from "@/lib/page-cta-i18n";
import { resolveQuotes } from "@/lib/quotes/resolve-quotes";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("quotes");
  return { title: t("title"), description: t("description"), alternates: localeAlternates("/quotes", locale) };
}

export default async function QuotesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("quotes");
  const tCommon = await getTranslations("common");
  const initial = await resolveQuotes();

  const initialWarning =
    initial.warningKey === "mockData"
      ? t("warningMock")
      : initial.warningKey === "providerFallback" && initial.warningParams
        ? t("warningFallback", initial.warningParams)
        : undefined;

  const ctaRow = await pageCtaItems("trading", "explore");

  return (
    <div className="space-y-8">
      <PageHeader title={t("title")} description={t("description")} />
      <LiveQuotesTable
        initial={initial.quotes}
        initialSource={initial.source}
        initialWarning={initialWarning}
        initialUpdatedAt={initial.updatedAt}
      />
      <PageCtaRow heading={tCommon("ctaDiscovery")} items={ctaRow} />
    </div>
  );
}
