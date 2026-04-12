import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChartContainer } from "@/components/charts/chart-container";
import { PageCtaRow } from "@/components/layout/page-cta-row";
import { pageCtas } from "@/lib/page-cta-presets";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("chart");
  return { title: t("title"), description: t("description") };
}

export default async function ChartPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("chart");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("description")}
        </p>
      </div>
      <Suspense>
        <ChartContainer locale={locale} />
      </Suspense>
      <PageCtaRow
        heading="→"
        items={[...pageCtas.trading, ...pageCtas.explore]}
      />
    </div>
  );
}
