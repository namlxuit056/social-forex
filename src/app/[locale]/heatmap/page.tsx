import { getTranslations, setRequestLocale } from "next-intl/server";
import { localeAlternates } from "@/lib/site-url";
import { PageCtaRow } from "@/components/layout/page-cta-row";
import { pageCtaItems } from "@/lib/page-cta-i18n";
import { resolveQuotes } from "@/lib/quotes/resolve-quotes";
import { STRENGTH_CURRENCIES, buildStrengthMatrix } from "@/lib/market/currency-strength";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("heatmap");
  return { title: t("title"), alternates: localeAlternates("/heatmap", locale) };
}

export const dynamic = "force-dynamic";

const currencies = STRENGTH_CURRENCIES;

function cellColor(v: number | null) {
  if (v === null) return "bg-muted";
  if (v > 0.6) return "bg-primary/40";
  if (v > 0.55) return "bg-primary/25";
  if (v < 0.4) return "bg-destructive/40";
  if (v < 0.45) return "bg-destructive/25";
  return "bg-muted/80";
}

export default async function HeatmapPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("heatmap");

  const { quotes: allQuotes, source } = await resolveQuotes();
  const grid = buildStrengthMatrix(allQuotes);

  const sourceLabel =
    source === "tradingview"
      ? t("source_tradingview")
      : source === "massive"
      ? t("source_massive")
      : source === "yahoo"
        ? t("source_yahoo")
        : source === "mock" || source === "mock_fallback"
          ? t("source_mock")
          : source;
  const tCommon = await getTranslations("common");
  const ctaRow = await pageCtaItems("trading", "explore");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-xl font-semibold text-foreground">
          {t("title")}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {t("description", { source: sourceLabel })}
        </p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border p-4">
        <table className="border-collapse text-xs">
          <thead>
            <tr>
              <th className="p-1" />
              {currencies.map((c) => (
                <th key={c} className="p-1 font-mono text-muted-foreground">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((row) => (
              <tr key={row.base}>
                <td className="p-1 font-mono font-medium text-muted-foreground">{row.base}</td>
                {row.values.map((v, i) => (
                  <td
                    key={currencies[i]}
                    className={`h-10 w-10 border border-border p-0 text-center font-mono ${cellColor(v)}`}
                  >
                    {v === null ? "" : v.toFixed(2)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">{sourceLabel}</p>
      <PageCtaRow heading={tCommon("ctaDiscovery")} items={ctaRow} />
    </div>
  );
}
