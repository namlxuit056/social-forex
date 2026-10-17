import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Impact } from "@/lib/calendar/types";
import type { NewsContextEventRow } from "@/lib/calendar/news-context-db";

function toImpact(s: string): Impact {
  const x = s.toLowerCase();
  if (x === "high" || x.includes("high")) return "high";
  if (x === "low" || x.includes("low")) return "low";
  return "medium";
}

const impactClass: Record<Impact, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-amber-500/15 text-amber-700 dark:text-amber-200/95",
  high: "bg-destructive/20 text-destructive",
};

export async function SignalNewsContext({
  events,
  locale,
  windowHours,
}: {
  events: NewsContextEventRow[];
  locale: string;
  windowHours: number;
}) {
  const t = await getTranslations("signals");
  const tCal = await getTranslations("calendar");
  const timeZone = locale === "vi" ? "Asia/Ho_Chi_Minh" : "UTC";

  const impactLabel = (impact: Impact) =>
    impact === "low"
      ? tCal("impactLow")
      : impact === "medium"
        ? tCal("impactMedShort")
        : tCal("impactHigh");

  const fmt = new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Card className="border-border bg-muted/10">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 font-heading text-base font-semibold">
          <Calendar className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          {t("newsContext.title", { hours: windowHours })}
        </CardTitle>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t("newsContext.disclaimer")}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("newsContext.empty")}
          </p>
        ) : (
          <ul className="space-y-2.5">
            {events.map((ev) => {
              const imp = toImpact(ev.impact);
              return (
                <li
                  key={ev.id}
                  className="flex flex-col gap-1 border-b border-border pb-2.5 last:border-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <time
                        dateTime={ev.timeUtc.toISOString()}
                        className="font-mono tabular-nums"
                      >
                        {fmt.format(ev.timeUtc)}
                      </time>
                      <span className="font-mono text-foreground">
                        {ev.currency}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-foreground">
                      {ev.title}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 self-start rounded px-2 py-0.5 text-xs font-medium",
                      impactClass[imp],
                    )}
                  >
                    {impactLabel(imp)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <Link
          href="/calendar"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "inline-flex w-full sm:w-auto",
          )}
        >
          {t("newsContext.viewFullCalendar")}
        </Link>
      </CardContent>
    </Card>
  );
}
