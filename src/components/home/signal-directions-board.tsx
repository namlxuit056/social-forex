import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import {
  aggregateSignalDirections,
  type SourceVote,
} from "@/lib/quotes/recent-signal-directions";
import { cn } from "@/lib/utils";

const WINDOW_DAYS = 7;

function BiasBadge({
  bias,
  label,
}: {
  bias: "buy" | "sell" | "mixed";
  label: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold",
        bias === "buy" &&
          "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
        bias === "sell" && "bg-red-500/12 text-red-700 dark:text-red-300",
        bias === "mixed" && "bg-amber-500/12 text-amber-700 dark:text-amber-300",
      )}
    >
      {bias === "buy" ? (
        <TrendingUp className="size-3.5" aria-hidden />
      ) : bias === "sell" ? (
        <TrendingDown className="size-3.5" aria-hidden />
      ) : null}
      {label}
    </span>
  );
}

export async function SignalDirectionsBoard({
  locale,
  nowIso,
}: {
  locale: string;
  nowIso: string;
}) {
  const t = await getTranslations("home");
  const ts = await getTranslations("signalSources");

  const now = new Date(nowIso).getTime();
  const since = new Date(now - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const rows = await prisma.notification.findMany({
    where: { kind: "TECHNICAL_RATING_SIGNAL", createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    distinct: ["dedupeKey"],
    take: 500,
    select: { dedupeKey: true, createdAt: true, meta: true },
  });

  const directions = aggregateSignalDirections(rows);
  if (directions.length === 0) return null;

  const voteLabel = (v: SourceVote) =>
    `${ts(v.source)} ${v.signal === "buy" ? ts("buy") : ts("sell")}`;

  return (
    <section
      aria-labelledby="signal-directions-heading"
      className="rounded-2xl border border-border bg-card/45 p-5 ring-1 ring-foreground/5 sm:p-6"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2
            id="signal-directions-heading"
            className="font-heading text-xl font-semibold tracking-tight text-foreground"
          >
            {t("signalBoardTitle")}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {t("signalBoardDesc", { days: WINDOW_DAYS })}
          </p>
        </div>
        <Link
          href="/quotes/technical-rating"
          className="flex shrink-0 items-center gap-1 text-sm text-primary hover:underline"
        >
          {t("signalBoardViewAll")}
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-120 border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-2 pr-3 font-medium">{t("signalBoardColPair")}</th>
              <th className="py-2 pr-3 font-medium">{t("signalBoardColBias")}</th>
              <th className="py-2 pr-3 font-medium">{t("signalBoardColSources")}</th>
              <th className="py-2 font-medium">{t("signalBoardColUpdated")}</th>
            </tr>
          </thead>
          <tbody>
            {directions.map((d) => (
              <tr key={d.symbol} className="border-b border-border/50 last:border-0">
                <td className="py-2.5 pr-3 font-mono font-medium text-foreground">
                  {d.symbol}
                </td>
                <td className="py-2.5 pr-3">
                  <BiasBadge
                    bias={d.bias}
                    label={
                      d.bias === "buy"
                        ? ts("buy")
                        : d.bias === "sell"
                          ? ts("sell")
                          : t("signalBoardBiasMixed")
                    }
                  />
                  {d.buyCount + d.sellCount > 1 ? (
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      {d.buyCount}↑ / {d.sellCount}↓
                    </span>
                  ) : null}
                </td>
                <td className="py-2.5 pr-3">
                  <div className="flex flex-wrap gap-1.5">
                    {d.sources.map((v) => (
                      <span
                        key={v.source}
                        className={cn(
                          "inline-flex items-center rounded border px-1.5 py-0.5 text-xs",
                          v.signal === "buy"
                            ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                            : "border-red-500/40 text-red-700 dark:text-red-300",
                        )}
                      >
                        {voteLabel(v)}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-2.5 text-xs text-muted-foreground">
                  {d.latestAt.toLocaleDateString(locale, {
                    day: "2-digit",
                    month: "2-digit",
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">{t("signalBoardHint")}</p>
    </section>
  );
}
