import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageCtaRow } from "@/components/layout/page-cta-row";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { pageCtas } from "@/lib/page-cta-presets";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("partners");
  return { title: t("title") };
}

export default async function PartnersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("partners");
  const tn = await getTranslations("nav");

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          {t("title")}
        </h1>
        <p className="mt-2 text-muted-foreground">{t("description")}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monetization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
          <ul className="list-inside list-disc space-y-2 text-sm">
            <li>IB: commission per lot — tracking UTM links.</li>
            <li>VIP signals: Stripe → update vipUntil.</li>
            <li>Broker listing: comparison table with fixed criteria.</li>
          </ul>
          <p className="text-sm">
            <Link href="/brokers" className="font-medium text-primary hover:underline">
              {tn("brokers")}
            </Link>
            {" · "}
            <Link href="/resources" className="font-medium text-primary hover:underline">
              {tn("resources")}
            </Link>
          </p>
        </CardContent>
      </Card>
      <PageCtaRow heading="→" items={[...pageCtas.risk, ...pageCtas.learn]} />
    </div>
  );
}
