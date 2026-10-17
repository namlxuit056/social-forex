"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Calendar } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { ImpactBadge } from "@/components/ui/status-badge";
import { type Impact, normalizeImpact } from "@/lib/ui/status-map";
import { buttonVariants } from "@/components/ui/button";
import type { SignalCardNewsEvent } from "@/lib/signals/signal-list-news";

export function SignalCardNews({
  symbol,
  events,
  windowHours,
}: {
  symbol: string;
  events: SignalCardNewsEvent[];
  windowHours: number;
}) {
  const t = useTranslations("signals");
  const tCal = useTranslations("calendar");
  const locale = useLocale();

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

  const impactLabel = (impact: Impact) =>
    impact === "low"
      ? tCal("impactLow")
      : impact === "medium"
        ? tCal("impactMedShort")
        : tCal("impactHigh");

  if (events.length === 0) return null;

  return (
    <aside
      className="flex shrink-0 flex-col border-t border-border bg-muted/20 lg:w-[min(100%,20rem)] lg:border-l lg:border-t-0 lg:border-border"
      aria-label={t("newsContext.cardAria", { symbol })}
    >
      <div className="border-b border-border bg-muted/30 px-3 py-2.5 sm:px-4">
        <h3 className="flex items-center gap-2 font-heading text-xs font-semibold uppercase tracking-wide text-foreground">
          <Calendar className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          {t("newsContext.cardTitle")}
        </h3>
        <p className="mt-0.5 text-[0.65rem] leading-snug text-muted-foreground">
          {t("newsContext.cardSubtitle", { hours: windowHours })}
        </p>
      </div>
      <ul className="flex flex-1 flex-col gap-0 divide-y divide-border px-3 py-2 sm:px-4">
        {events.map((ev) => {
          const imp = normalizeImpact(ev.impact);
          const d = new Date(ev.timeUtc);
          return (
            <li key={ev.id} className="py-2.5 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[0.65rem] text-muted-foreground">
                    <time dateTime={ev.timeUtc} className="font-mono tabular-nums">
                      {fmt.format(d)}
                    </time>
                    <span className="font-mono text-foreground">{ev.currency}</span>
                  </div>
                  <p className="mt-1 line-clamp-3 text-xs leading-snug text-foreground">
                    {ev.title}
                  </p>
                </div>
                <ImpactBadge impact={imp} label={impactLabel(imp)} />
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-auto border-t border-border p-3 sm:p-4">
        <Link
          href="/calendar"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "h-8 w-full text-xs",
          )}
        >
          {t("newsContext.viewFullCalendar")}
        </Link>
      </div>
    </aside>
  );
}
