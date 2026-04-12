import { getTranslations, setRequestLocale } from "next-intl/server";
import { DemoBacktest } from "@/components/backtest/demo-backtest";
import { Disclaimer } from "@/components/layout/disclaimer";
import { PageCtaRow } from "@/components/layout/page-cta-row";
import { pageCtas } from "@/lib/page-cta-presets";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("backtest");
  return { title: t("title"), description: t("description") };
}

export default async function BacktestPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("backtest");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          {t("title")}
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          {t("description")}
        </p>
      </div>
      <DemoBacktest />
      <Disclaimer variant="compact" />
      <PageCtaRow heading="→" items={[...pageCtas.trading, ...pageCtas.explore]} />
    </div>
  );
}
