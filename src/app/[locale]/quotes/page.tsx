import { getTranslations, setRequestLocale } from "next-intl/server";
import { LiveQuotesTable } from "@/components/quotes/live-quotes-table";
import { PageCtaRow } from "@/components/layout/page-cta-row";
import { resolveQuotes } from "@/lib/quotes/resolve-quotes";
import { pageCtas } from "@/lib/page-cta-presets";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("quotes");
  return { title: t("title"), description: t("description") };
}

export default async function QuotesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("quotes");
  const initial = await resolveQuotes();

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
      <LiveQuotesTable
        initial={initial.quotes}
        initialSource={initial.source}
        initialWarning={initial.warning}
        initialUpdatedAt={initial.updatedAt}
      />
      <PageCtaRow heading="→" items={[...pageCtas.trading, ...pageCtas.explore]} />
    </div>
  );
}
