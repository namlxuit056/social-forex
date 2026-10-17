import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { localeAlternates } from "@/lib/site-url";
import { ChartContainer } from "@/components/charts/chart-container";
import { PageCtaRow } from "@/components/layout/page-cta-row";
import { pageCtaItems } from "@/lib/page-cta-i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("chart");
  return { title: t("title"), description: t("description"), alternates: localeAlternates("/chart", locale) };
}

export default async function ChartPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("chart");
  const tCommon = await getTranslations("common");
  const ctaRow = await pageCtaItems("trading", "explore");

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />
      <Suspense>
        <ChartContainer locale={locale} />
      </Suspense>
      <PageCtaRow heading={tCommon("ctaDiscovery")} items={ctaRow} />
    </div>
  );
}
