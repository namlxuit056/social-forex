"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buildMonthGrid, type CalendarTrade } from "@/lib/journal/calendar-heatmap";

function fmtCurrency(v: number) {
  const sign = v >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(v).toFixed(0)}`;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function JournalCalendar({
  trades,
  locale,
}: {
  trades: CalendarTrade[];
  locale: string;
}) {
  const t = useTranslations("journal");
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const weeks = useMemo(() => buildMonthGrid(trades, year, month), [trades, year, month]);

  const maxAbsPnl = useMemo(() => {
    let max = 0;
    for (const row of weeks) for (const cell of row) max = Math.max(max, Math.abs(cell.pnl));
    return max;
  }, [weeks]);

  const monthLabel = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(cursor),
    [locale, cursor],
  );

  // Dùng translation key thay vì Intl.DateTimeFormat({weekday:"short"}) — tên thứ viết tắt
  // của locale "vi" khác nhau giữa ICU server (Node) và client (browser), gây hydration mismatch.
  const weekdayLabels = [0, 1, 2, 3, 4, 5, 6].map((i) => t(`calWeekday${i}`));

  const monthTotal = useMemo(
    () => weeks.flat().reduce((sum, c) => sum + c.pnl, 0),
    [weeks],
  );

  return (
    <Card className="border-border">
      <CardHeader className="flex-row items-center justify-between gap-4 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="size-4 text-chart-3" />
            {t("calTitle")}
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">{t("calDescription")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setCursor(new Date(year, month - 1, 1))}
            aria-label={t("calPrevMonth")}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-32 text-center text-sm font-semibold capitalize tabular-nums">
            {monthLabel}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setCursor(new Date(year, month + 1, 1))}
            aria-label={t("calNextMonth")}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-medium uppercase text-muted-foreground">
          {weekdayLabels.map((label, i) => (
            <div key={i}>{label}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {weeks.flat().map((cell, i) => {
            if (!cell.date) return <div key={i} className="aspect-square" />;
            const isToday = isSameDay(cell.date, today);
            const intensity = maxAbsPnl > 0 ? Math.abs(cell.pnl) / maxAbsPnl : 0;
            const hasTrades = cell.trades > 0;
            return (
              <div
                key={i}
                className={cn(
                  "flex aspect-square flex-col justify-between rounded-lg border p-1.5 sm:p-2",
                  isToday ? "border-amber-500" : "border-border",
                  !hasTrades && "bg-muted/10",
                )}
                style={
                  hasTrades
                    ? {
                        backgroundColor:
                          cell.pnl >= 0
                            ? `rgba(16,185,129,${0.08 + intensity * 0.22})`
                            : `rgba(239,68,68,${0.08 + intensity * 0.22})`,
                      }
                    : undefined
                }
              >
                <span className="text-[11px] text-muted-foreground">{cell.date.getDate()}</span>
                {hasTrades && (
                  <div className="space-y-0.5">
                    <p
                      className={cn(
                        "font-mono text-[11px] font-bold leading-tight sm:text-xs",
                        cell.pnl >= 0 ? "text-emerald-500" : "text-red-500",
                      )}
                    >
                      {fmtCurrency(cell.pnl)}
                    </p>
                    <p className="text-[9px] leading-tight text-muted-foreground sm:text-[10px]">
                      {t("calTradeCount", { count: cell.trades })}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between border-t border-border pt-2 text-xs">
          <span className="text-muted-foreground">{t("calMonthTotal")}</span>
          <span
            className={cn(
              "font-mono font-semibold",
              monthTotal >= 0 ? "text-emerald-500" : "text-red-500",
            )}
          >
            {fmtCurrency(monthTotal)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
