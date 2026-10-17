"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { STATS_RANGES, type StatsRange } from "@/lib/journal/stats-range";

const RANGE_KEY: Record<StatsRange, string> = {
  "7d": "statsRange7d",
  "30d": "statsRange30d",
  "90d": "statsRange90d",
  all: "statsRangeAll",
};

export function JournalStatsFilter({
  range,
  pair,
  pairs,
}: {
  range: StatsRange;
  pair: string | null;
  pairs: string[];
}) {
  const t = useTranslations("journal");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function go(next: { range: StatsRange; pair: string | null }) {
    const params = new URLSearchParams({ tab: "stats" });
    if (next.range !== "all") params.set("range", next.range);
    if (next.pair) params.set("pair", next.pair);
    startTransition(() => {
      router.push(`/journal?${params.toString()}`, { scroll: false });
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/20 p-3">
      <span className="text-xs font-medium text-muted-foreground">{t("statsFilterPeriod")}</span>
      <div className="flex rounded-md border border-border bg-background p-0.5">
        {STATS_RANGES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => go({ range: r, pair })}
            aria-pressed={range === r}
            className={cn(
              "inline-flex h-7 items-center rounded-sm px-2.5 text-xs font-medium transition-colors",
              range === r
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t(RANGE_KEY[r])}
          </button>
        ))}
      </div>

      <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {t("statsFilterPair")}
        <select
          value={pair ?? ""}
          onChange={(e) => go({ range, pair: e.target.value || null })}
          className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground"
        >
          <option value="">{t("statsFilterAllPairs")}</option>
          {pair && !pairs.includes(pair) && <option value={pair}>{pair}</option>}
          {pairs.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>

      {pending && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />}
    </div>
  );
}
