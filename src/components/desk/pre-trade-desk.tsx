"use client";

import { type ReactNode, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { getPathname } from "@/i18n/navigation";
import {
  AlertTriangle,
  Calculator,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { positionSizeLots, stopLossPips } from "@/lib/calculators";
import { symbolToCurrencies } from "@/lib/signals/symbol-currencies";
import type { QuoteRow } from "@/lib/quotes/types";
import type { SignalCardNewsEvent } from "@/lib/signals/signal-list-news";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldSelect } from "@/components/ui/field-select";
import { ImpactBadge } from "@/components/ui/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ChecklistKey = "news" | "levels" | "risk" | "mindset" | "journal";

const CHECKLIST_KEYS: ChecklistKey[] = [
  "news",
  "levels",
  "risk",
  "mindset",
  "journal",
];

function toImpact(impact: string): "high" | "medium" | "low" {
  const x = impact.toLowerCase();
  if (x === "high" || x.includes("high")) return "high";
  if (x === "low" || x.includes("low")) return "low";
  return "medium";
}

function quoteForSymbol(quotes: QuoteRow[], symbol: string) {
  return quotes.find((quote) => quote.symbol === symbol) ?? quotes[0];
}

function midPrice(quote: QuoteRow | undefined) {
  if (!quote) return 1;
  return Number(((quote.bid + quote.ask) / 2).toFixed(quote.symbol.includes("JPY") ? 3 : 5));
}

function numberValue(value: string) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function PreTradeDesk({
  quotes,
  newsEvents,
  newsContextHours,
  chart,
}: {
  quotes: QuoteRow[];
  newsEvents: SignalCardNewsEvent[];
  newsContextHours: number;
  /** Rendered beside the sizing panel so price and lot size are read together. */
  chart?: ReactNode;
}) {
  const t = useTranslations("desk");
  const tCal = useTranslations("calendar");
  const locale = useLocale();

  const router = useRouter();
  const searchParams = useSearchParams();
  // The chart beside this panel reads and writes ?symbol=, so the URL is the
  // shared source of truth for which market both are looking at.
  const urlSymbol = searchParams.get("symbol")?.toUpperCase() ?? null;
  const knownUrlSymbol =
    urlSymbol && quotes.some((quote) => quote.symbol === urlSymbol) ? urlSymbol : null;

  const [symbol, setSymbol] = useState(
    knownUrlSymbol ?? quoteForSymbol(quotes, "XAUUSD")?.symbol ?? quotes[0]?.symbol ?? "EURUSD",
  );
  const selectedQuote = quoteForSymbol(quotes, symbol);
  const selectedMid = midPrice(selectedQuote);

  const [balance, setBalance] = useState("10000");
  const [riskPct, setRiskPct] = useState("1");
  const [entry, setEntry] = useState(String(selectedMid));
  const [stopLoss, setStopLoss] = useState(String(selectedMid));

  const switchSymbol = (next: string) => {
    const nextMid = midPrice(quoteForSymbol(quotes, next));
    setSymbol(next);
    setEntry(String(nextMid));
    setStopLoss(String(nextMid));
  };

  // Follow symbol changes made from the chart watchlist (state adjusted
  // during render rather than in an effect, per React guidance).
  const [syncedUrlSymbol, setSyncedUrlSymbol] = useState(knownUrlSymbol);
  if (knownUrlSymbol !== syncedUrlSymbol) {
    setSyncedUrlSymbol(knownUrlSymbol);
    if (knownUrlSymbol && knownUrlSymbol !== symbol) switchSymbol(knownUrlSymbol);
  }

  const selectSymbol = (next: string) => {
    switchSymbol(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set("symbol", next);
    router.replace(`?${params.toString()}`, { scroll: false });
  };
  const [checked, setChecked] = useState<Record<ChecklistKey, boolean>>({
    news: false,
    levels: false,
    risk: false,
    mindset: false,
    journal: false,
  });

  const currencies = useMemo(() => new Set(symbolToCurrencies(symbol)), [symbol]);
  const relatedEvents = useMemo(
    () => newsEvents.filter((event) => currencies.has(event.currency)).slice(0, 5),
    [currencies, newsEvents],
  );

  const slPips = useMemo(
    () =>
      stopLossPips({
        symbol,
        entry: numberValue(entry),
        stopLoss: numberValue(stopLoss),
      }),
    [entry, stopLoss, symbol],
  );

  const riskPlan = useMemo(
    () =>
      positionSizeLots({
        balance: numberValue(balance),
        riskPct: numberValue(riskPct),
        stopLossPips: slPips,
        symbol,
        price: selectedMid,
        quote: symbol.includes("JPY") ? "JPY" : "USD",
      }),
    [balance, riskPct, selectedMid, slPips, symbol],
  );

  const checklistDone = CHECKLIST_KEYS.filter((key) => checked[key]).length;
  const hasHighImpact = relatedEvents.some((event) => toImpact(event.impact) === "high");
  const ready = checklistDone === CHECKLIST_KEYS.length && riskPlan.lots > 0 && !hasHighImpact;
  const timeZone = locale === "vi" ? "Asia/Ho_Chi_Minh" : "UTC";

  const fmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
        timeZone,
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [locale, timeZone],
  );

  const planHref = useMemo(() => {
    const params = new URLSearchParams({
      symbol,
      riskPct: riskPct || "1",
      news: relatedEvents
        .slice(0, 3)
        .map((event) => `${event.currency} ${event.title}`)
        .join("; "),
    });
    return `${getPathname({ href: "/plan", locale })}?${params.toString()}`;
  }, [locale, relatedEvents, riskPct, symbol]);

  return (
    <section className="space-y-4" aria-labelledby="pre-trade-desk-title">
      <div className="flex flex-col gap-1 border-b border-border pb-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="pre-trade-desk-title" className="font-heading text-lg font-medium text-foreground">
            {t("preTradeTitle")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("preTradeSubtitle")}</p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "h-7 rounded-md px-2.5",
            ready ? "border-primary/35 bg-primary/10 text-primary" : "border-amber-500/35 bg-amber-500/10 text-amber-600 dark:text-amber-300",
          )}
        >
          {ready ? t("readyBadge") : t("notReadyBadge")}
        </Badge>
      </div>

      <div
        className={cn(
          "grid gap-4",
          chart
            ? "xl:grid-cols-[minmax(0,1fr)_22rem]"
            : "xl:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]",
        )}
      >
        {chart ? <div className="min-w-0">{chart}</div> : null}
        <div
          className={cn(
            chart ? "space-y-4 xl:sticky xl:top-20 xl:self-start" : "contents",
          )}
        >
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" aria-hidden />
                {t("setupTitle")}
              </CardTitle>
              <CardDescription>{t("setupDesc")}</CardDescription>
            </CardHeader>
            <CardContent className={cn("grid gap-4", !chart && "lg:grid-cols-2")}>
              <div className="space-y-3">
                <FieldSelect
                  id="desk-symbol"
                  label={t("symbolLabel")}
                  value={symbol}
                  onValueChange={selectSymbol}
                  options={quotes.map((quote) => ({
                    value: quote.symbol,
                    label: `${quote.symbol} - ${quote.name}`,
                  }))}
                />
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-md border border-border/60 bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">{t("midPrice")}</p>
                    <p className="mt-1 font-mono text-lg tabular-nums text-foreground">{selectedMid}</p>
                  </div>
                  <div className="rounded-md border border-border/60 bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">{t("spread")}</p>
                    <p className="mt-1 font-mono text-lg tabular-nums text-foreground">
                      {selectedQuote ? Number((selectedQuote.ask - selectedQuote.bid).toFixed(5)) : "0"}
                    </p>
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">{t("riskHint")}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-sm font-medium">{t("balance")}</span>
                  <Input inputMode="decimal" value={balance} onChange={(event) => setBalance(event.target.value)} />
                </label>
                <label className="space-y-1.5">
                  <span className="text-sm font-medium">{t("riskPct")}</span>
                  <Input inputMode="decimal" value={riskPct} onChange={(event) => setRiskPct(event.target.value)} />
                </label>
                <label className="space-y-1.5">
                  <span className="text-sm font-medium">{t("entry")}</span>
                  <Input inputMode="decimal" value={entry} onChange={(event) => setEntry(event.target.value)} />
                </label>
                <label className="space-y-1.5">
                  <span className="text-sm font-medium">{t("stopLoss")}</span>
                  <Input inputMode="decimal" value={stopLoss} onChange={(event) => setStopLoss(event.target.value)} />
                </label>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="size-4 text-primary" aria-hidden />
                {t("riskResultTitle")}
              </CardTitle>
              <CardDescription>{t("riskResultDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-2 rounded-md border border-border/60 bg-muted/20 p-3 font-mono text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">{t("slPips")}</dt>
                  <dd className="tabular-nums text-foreground">{slPips}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">{t("riskMoney")}</dt>
                  <dd className="tabular-nums text-foreground">${riskPlan.riskAmount}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">{t("pipValue")}</dt>
                  <dd className="tabular-nums text-foreground">${riskPlan.pipValuePerLot}</dd>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-2 text-primary">
                  <dt>{t("suggestedLots")}</dt>
                  <dd className="text-xl tabular-nums">{riskPlan.lots}</dd>
                </div>
              </dl>
              <a href={planHref} className="mt-4 block">
                <Button className="w-full" size="sm">
                  <ClipboardCheck className="size-4" aria-hidden />
                  {t("useInPlan")}
                  <ExternalLink className="size-3.5" aria-hidden />
                </Button>
              </a>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="size-4 text-primary" aria-hidden />
              {t("newsTitle", { hours: newsContextHours })}
            </CardTitle>
            <CardDescription>{t("newsDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {relatedEvents.length === 0 ? (
              <p className="rounded-md border border-border/60 bg-muted/20 p-3 text-sm text-muted-foreground">
                {t("newsEmpty")}
              </p>
            ) : (
              <ul className="space-y-2">
                {relatedEvents.map((event) => {
                  const impact = toImpact(event.impact);
                  return (
                    <li key={event.id} className="rounded-md border border-border/60 bg-muted/15 p-3">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <time dateTime={event.timeUtc} className="font-mono tabular-nums">
                          {fmt.format(new Date(event.timeUtc))}
                        </time>
                        <span className="font-mono text-foreground">{event.currency}</span>
                        <ImpactBadge
                          impact={impact}
                          label={impact === "high" ? tCal("impactHigh") : impact === "medium" ? tCal("impactMedShort") : tCal("impactLow")}
                        />
                      </div>
                      <p className="mt-1 text-sm leading-snug text-foreground">{event.title}</p>
                    </li>
                  );
                })}
              </ul>
            )}
            {hasHighImpact ? (
              <p className="mt-3 flex items-start gap-2 rounded-md border border-destructive/25 bg-destructive/10 p-3 text-xs leading-relaxed text-destructive">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                {t("highImpactWarning")}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-primary" aria-hidden />
              {t("checklistTitle")}
            </CardTitle>
            <CardDescription>{t("checklistDesc", { done: checklistDone, total: CHECKLIST_KEYS.length })}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {CHECKLIST_KEYS.map((key) => (
              <label
                key={key}
                className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
              >
                <Checkbox
                  checked={checked[key]}
                  onCheckedChange={(value) => setChecked((prev) => ({ ...prev, [key]: value }))}
                  className="mt-0.5"
                />
                <span>
                  <span className="block text-sm font-medium text-foreground">{t(`checklist.${key}.title`)}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{t(`checklist.${key}.desc`)}</span>
                </span>
              </label>
            ))}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
