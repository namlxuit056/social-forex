import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type StatTrend = "positive" | "negative" | "neutral";

const VALUE_TONE: Record<StatTrend, string> = {
  positive: "text-success",
  negative: "text-danger",
  neutral: "text-foreground",
};

/** KPI tile: label, one big number, optional sub-line. Colour only on the number. */
export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  trend = "neutral",
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  icon?: LucideIcon;
  trend?: StatTrend;
  className?: string;
}) {
  return (
    <div
      data-slot="stat-card"
      data-trend={trend}
      className={cn("rounded-xl border border-border bg-card p-4", className)}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        {Icon ? (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Icon className="size-4 text-muted-foreground" aria-hidden />
          </span>
        ) : null}
      </div>
      <p
        className={cn(
          "mt-1 font-mono text-2xl font-semibold tabular-nums tracking-tight",
          VALUE_TONE[trend],
        )}
      >
        {value}
      </p>
      {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

/** Sign of a number as a StatCard trend; null/NaN reads as neutral. */
export function trendOf(value: number | null | undefined, pivot = 0): StatTrend {
  if (value == null || Number.isNaN(value) || value === pivot) return "neutral";
  return value > pivot ? "positive" : "negative";
}
