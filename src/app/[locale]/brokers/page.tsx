import { getTranslations, setRequestLocale } from "next-intl/server";
import { Disclaimer } from "@/components/layout/disclaimer";
import { PageCtaRow } from "@/components/layout/page-cta-row";
import { pageCtaItems } from "@/lib/page-cta-i18n";

const brokers = [
  { name: "IC Markets", spread: "0.0–0.6", regulation: "ASIC, CySEC, SCB", minDeposit: "$200", note: "Raw spread, scalping/EA." },
  { name: "Exness", spread: "0.0–1.0", regulation: "FCA, CySEC, FSA", minDeposit: "$1", note: "Fast deposit/withdrawal." },
  { name: "XM", spread: "0.6–1.6", regulation: "CySEC, ASIC, IFSC", minDeposit: "$5", note: "Diverse bonuses." },
  { name: "Pepperstone", spread: "0.0–0.7", regulation: "FCA, ASIC, CySEC, DFSA", minDeposit: "$200", note: "Fast execution, TradingView." },
  { name: "FXTM (ForexTime)", spread: "0.5–1.5", regulation: "FCA, CySEC, FSCA", minDeposit: "$10", note: "Copy trading." },
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("brokers");
  return { title: t("title"), description: t("description") };
}

export default async function BrokersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("brokers");
  const tCommon = await getTranslations("common");
  const ctaRow = await pageCtaItems("risk", "explore");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          {t("title")}
        </h1>
        <p className="mt-2 text-muted-foreground">{t("description")}</p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-4 py-3">{t("name")}</th>
              <th className="px-4 py-3">{t("spread")}</th>
              <th className="px-4 py-3">{t("regulation")}</th>
              <th className="px-4 py-3">{t("minDeposit")}</th>
              <th className="px-4 py-3">{t("note")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {brokers.map((b) => (
              <tr key={b.name} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-medium text-foreground">{b.name}</td>
                <td className="px-4 py-3 font-mono">{b.spread}</td>
                <td className="px-4 py-3">{b.regulation}</td>
                <td className="px-4 py-3 font-mono">{b.minDeposit}</td>
                <td className="px-4 py-3 text-muted-foreground">{b.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Disclaimer variant="compact" />
      <PageCtaRow heading={tCommon("ctaDiscovery")} items={ctaRow} />
    </div>
  );
}
