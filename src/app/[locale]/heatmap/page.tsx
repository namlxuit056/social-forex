import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageCtaRow } from "@/components/layout/page-cta-row";
import { pageCtas } from "@/lib/page-cta-presets";
import { resolveQuotes } from "@/lib/quotes/resolve-quotes";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("heatmap");
  return { title: t("title") };
}

export const dynamic = "force-dynamic";

const currencies = ["USD", "EUR", "JPY", "GBP", "AUD", "CAD", "CHF", "NZD"];

function buildStrengthMatrix(
  quotes: { symbol: string; bid: number; ask: number; changePct: number }[],
) {
  const changeMap = new Map<string, number>();
  for (const q of quotes) {
    changeMap.set(q.symbol.replace("/", ""), q.changePct);
  }

  const strength = new Map<string, number>();
  for (const c of currencies) {
    let total = 0;
    let count = 0;
    for (const other of currencies) {
      if (c === other) continue;
      const pair = `${c}${other}`;
      const inv = `${other}${c}`;
      if (changeMap.has(pair)) {
        total += changeMap.get(pair)!;
        count++;
      } else if (changeMap.has(inv)) {
        total -= changeMap.get(inv)!;
        count++;
      }
    }
    strength.set(c, count > 0 ? total / count : 0);
  }

  return currencies.map((base) => ({
    base,
    values: currencies.map((quote) => {
      if (base === quote) return null;
      const bStr = strength.get(base) ?? 0;
      const qStr = strength.get(quote) ?? 0;
      const diff = bStr - qStr;
      return Math.round(Math.max(0, Math.min(1, 0.5 + diff * 5)) * 100) / 100;
    }),
  }));
}

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
    source === "massive"
      ? t("source_massive")
      : source === "yahoo"
        ? t("source_yahoo")
        : source === "mock" || source === "mock_fallback"
          ? t("source_mock")
          : source;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
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
      <PageCtaRow heading="→" items={[...pageCtas.trading, ...pageCtas.explore]} />
    </div>
  );
}
