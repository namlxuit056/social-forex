import { Video } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EmptyState } from "@/components/layout/empty-state";
import { PageCtaRow } from "@/components/layout/page-cta-row";
import { pageCtaItems } from "@/lib/page-cta-i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("webinar");
  return { title: t("title"), description: t("description") };
}

export default async function WebinarPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("webinar");
  const ctaRow = await pageCtaItems("learn", "community");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          {t("title")}
        </h1>
        <p className="mt-2 text-muted-foreground">{t("description")}</p>
      </div>
      <EmptyState
        icon={Video}
        title={t("empty")}
        description={t("emptyHint")}
        primary={{ href: "/academy", label: "Academy" }}
      />
      <PageCtaRow heading={t("inMeantime")} items={ctaRow} />
    </div>
  );
}
