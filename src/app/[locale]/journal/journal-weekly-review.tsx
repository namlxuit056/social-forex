import { AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getTranslations } from "next-intl/server";
import type { AiJournalAnalysis } from "@/lib/ai/types";

type Review = {
  id: string;
  weekStart: string;
  weekEnd: string;
  tradeCount: number;
  analysis: AiJournalAnalysis;
};

function priorityVariant(priority: "high" | "medium" | "low") {
  if (priority === "high") return "destructive";
  if (priority === "medium") return "secondary";
  return "outline";
}

function formatWeekRange(weekStart: string, weekEnd: string) {
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  return `${fmt(weekStart)} – ${fmt(weekEnd)}`;
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
            {t("weeklyReviewWeek", { range: formatWeekRange(review.weekStart, review.weekEnd) })}
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
              {t("weeklyNextPlan")}
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

export async function JournalWeeklyReview({ reviews }: { reviews: Review[] }) {
  const t = await getTranslations("journal");

  if (reviews.length === 0) {
    return (
      <div className="py-12 text-center space-y-2">
        <p className="text-sm text-muted-foreground">{t("weeklyReviewEmpty")}</p>
        <p className="text-xs text-muted-foreground">{t("weeklyReviewEmptyHint")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reviews.map((review) => (
        <ReviewCard key={review.id} review={review} />
      ))}
    </div>
  );
}
