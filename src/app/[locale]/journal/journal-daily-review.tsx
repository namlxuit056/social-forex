import { AlertTriangle, CheckCircle2, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getTranslations } from "next-intl/server";
import type { AiJournalAnalysis } from "@/lib/ai/types";

type Review = {
  id: string;
  day: string;
  tradeCount: number;
  analysis: AiJournalAnalysis;
};

function priorityVariant(priority: "high" | "medium" | "low") {
  if (priority === "high") return "destructive";
  if (priority === "medium") return "secondary";
  return "outline";
}

function formatDay(day: string) {
  return new Date(day).toLocaleDateString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

async function ReviewCard({ review }: { review: Review }) {
  const t = await getTranslations("journal");
  const a = review.analysis;

  return (
    <details className="group rounded-xl border bg-card open:shadow-sm">
      <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 list-none">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium text-foreground">
            {t("dailyReviewDay", { day: formatDay(review.day) })}
          </span>
          <span className="text-xs text-muted-foreground">
            {review.tradeCount} {t("trades")}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`text-sm font-semibold ${a.score >= 70 ? "text-green-600 dark:text-green-400" : a.score >= 50 ? "text-yellow-600 dark:text-yellow-400" : "text-destructive"}`}
          >
            {a.score}/100
          </span>
          <svg
            className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </summary>

      <div className="px-5 pb-5 space-y-4 border-t pt-4">
        <p className="text-sm text-muted-foreground">{a.summary}</p>

        {a.strengths.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
              {t("weeklyStrengths")}
            </p>
            <ul className="space-y-1">
              {a.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-green-500 shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {a.improvementAreas.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
              {t("weeklyImprovements")}
            </p>
            <ul className="space-y-2">
              {a.improvementAreas.map((area, i) => (
                <li key={i} className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Badge variant={priorityVariant(area.priority)} className="text-[10px] h-4 px-1">
                      {area.priority}
                    </Badge>
                    <span className="text-sm font-medium">{area.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground pl-2">{area.evidence}</p>
                  <p className="text-xs text-primary pl-2">{area.action}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {a.riskFlags.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
              {t("weeklyRiskFlags")}
            </p>
            <ul className="space-y-1">
              {a.riskFlags.map((flag, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  {flag}
                </li>
              ))}
            </ul>
          </div>
        )}

        {a.patternInsights.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
              {t("weeklyPatterns")}
            </p>
            <ul className="space-y-1">
              {a.patternInsights.map((p, i) => (
                <li key={i} className="text-sm text-muted-foreground">• {p}</li>
              ))}
            </ul>
          </div>
        )}

        {a.nextReviewPlan.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
              {t("dailyNextPlan")}
            </p>
            <ul className="space-y-1">
              {a.nextReviewPlan.map((plan, i) => (
                <li key={i} className="text-sm text-muted-foreground">→ {plan}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </details>
  );
}

function scoreColorClass(score: number) {
  if (score >= 70) return "text-green-600 dark:text-green-400";
  if (score >= 50) return "text-yellow-600 dark:text-yellow-400";
  return "text-destructive";
}

async function DailyProgressTrend({ reviews }: { reviews: Review[] }) {
  const t = await getTranslations("journal");

  // reviews are ordered newest → oldest; chart reads left (oldest) to right (newest)
  const chronological = [...reviews].reverse();
  const scores = chronological.map((r) => r.analysis.score);
  const width = 600;
  const height = 120;
  const padX = 12;
  const padTop = 14;
  const padBottom = 24;
  const n = chronological.length;
  const stepX = n > 1 ? (width - padX * 2) / (n - 1) : 0;
  const points = scores.map((score, i) => {
    const x = padX + stepX * i;
    const y = padTop + (1 - score / 100) * (height - padTop - padBottom);
    return { x, y, score };
  });
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

  const latest = scores[scores.length - 1];
  const previous = scores.length > 1 ? scores[scores.length - 2] : null;
  const delta = previous !== null ? latest - previous : null;

  const DeltaIcon = delta === null || delta === 0 ? Minus : delta > 0 ? TrendingUp : TrendingDown;
  const deltaColor =
    delta === null || delta === 0
      ? "text-muted-foreground"
      : delta > 0
        ? "text-green-600 dark:text-green-400"
        : "text-destructive";

  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">{t("dailyProgressTitle")}</p>
          <p className="text-xs text-muted-foreground">{t("dailyProgressHint")}</p>
        </div>
        {delta !== null && (
          <div className={`flex items-center gap-1 text-sm font-medium ${deltaColor}`}>
            <DeltaIcon className="h-4 w-4" />
            {delta > 0 ? `+${delta}` : delta}
            <span className="text-xs text-muted-foreground">{t("dailyProgressVsYesterday")}</span>
          </div>
        )}
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="h-28 w-full" preserveAspectRatio="none">
        <line
          x1={padX}
          y1={padTop + (height - padTop - padBottom) / 2}
          x2={width - padX}
          y2={padTop + (height - padTop - padBottom) / 2}
          stroke="currentColor"
          strokeWidth={1}
          strokeDasharray="4 4"
          className="text-border"
        />
        {n > 1 && (
          <path d={linePath} fill="none" stroke="currentColor" strokeWidth={2} className="text-primary" />
        )}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3.5} fill="currentColor" className={scoreColorClass(p.score)} />
        ))}
      </svg>

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{formatDay(chronological[0].day)}</span>
        <span className={`font-semibold ${scoreColorClass(latest)}`}>{latest}/100</span>
        <span>{formatDay(chronological[n - 1].day)}</span>
      </div>
    </div>
  );
}

export async function JournalDailyReview({ reviews }: { reviews: Review[] }) {
  const t = await getTranslations("journal");

  if (reviews.length === 0) {
    return (
      <div className="py-12 text-center space-y-2">
        <p className="text-sm text-muted-foreground">{t("dailyReviewEmpty")}</p>
        <p className="text-xs text-muted-foreground">{t("dailyReviewEmptyHint")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.length > 1 && <DailyProgressTrend reviews={reviews} />}
      <div className="space-y-3">
        {reviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>
    </div>
  );
}
