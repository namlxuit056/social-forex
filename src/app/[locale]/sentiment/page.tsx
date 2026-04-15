import { BarChart3 } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageCtaRow } from "@/components/layout/page-cta-row";
import { EmptyState } from "@/components/layout/empty-state";
import { pageCtaItems } from "@/lib/page-cta-i18n";
import { prisma } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("sentiment");
  return { title: t("title") };
}

export const dynamic = "force-dynamic";

type SentimentRow = {
  symbol: string;
  long: number;
  short: number;
  total: number;
  longPct: number;
  shortPct: number;
};

export default async function SentimentPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("sentiment");

  const activeSignals = await prisma.signal.findMany({
    where: { status: "ACTIVE" },
    select: { symbol: true, direction: true },
  });

  const map = new Map<string, { long: number; short: number }>();
  for (const s of activeSignals) {
    const cur = map.get(s.symbol) ?? { long: 0, short: 0 };
    if (s.direction === "LONG") cur.long += 1;
    else cur.short += 1;
    map.set(s.symbol, cur);
  }

  const rows: SentimentRow[] = [...map.entries()]
    .map(([symbol, v]) => {
      const total = v.long + v.short;
      return {
        symbol,
        long: v.long,
        short: v.short,
        total,
        longPct: total > 0 ? Math.round((v.long / total) * 100) : 0,
        shortPct: total > 0 ? Math.round((v.short / total) * 100) : 0,
      };
    })
    .sort((a, b) => b.total - a.total);
  const tCommon = await getTranslations("common");
  const ctaRow = await pageCtaItems("trading", "community");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          {t("title")}
        </h1>
        <p className="mt-2 text-muted-foreground">{t("description")}</p>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title={t("empty")}
          description={t("emptyHint")}
          primary={{ href: "/signals", label: "→ Signals" }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((p) => (
            <div
              key={p.symbol}
              className="rounded-xl border border-border bg-card/50 p-5 ring-1 ring-foreground/5"
            >
              <div className="flex justify-between font-mono text-sm">
                <span className="font-semibold text-foreground">{p.symbol}</span>
                <span className="text-muted-foreground">
                  {t("signals", { count: p.total })}
                </span>
              </div>
              <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-muted">
                {p.longPct > 0 && (
                  <div className="bg-primary transition-all" style={{ width: `${p.longPct}%` }} />
                )}
                {p.shortPct > 0 && (
                  <div className="bg-destructive/80 transition-all" style={{ width: `${p.shortPct}%` }} />
                )}
              </div>
              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span className="text-primary">Long {p.longPct}%</span>
                <span className="text-destructive">Short {p.shortPct}%</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <PageCtaRow heading={tCommon("ctaDiscovery")} items={ctaRow} />
    </div>
  );
}
