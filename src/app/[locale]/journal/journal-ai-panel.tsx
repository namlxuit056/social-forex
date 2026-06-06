"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, CheckCircle2, Loader2, Sparkles, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  AiJournalAnalysisResponse,
  AiSuggestError,
} from "@/lib/ai/types";

function priorityVariant(priority: "high" | "medium" | "low") {
  if (priority === "high") return "destructive";
  if (priority === "medium") return "secondary";
  return "outline";
}

export function JournalAiPanel({ tradeCount }: { tradeCount: number }) {
  const t = useTranslations("journal");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AiJournalAnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function startCooldown(ms: number) {
    setCooldown(Math.ceil(ms / 1000));
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function analyze() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/journal-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as AiSuggestError;
        if (res.status === 429 && body.retryAfterMs) startCooldown(body.retryAfterMs);
        setError(body.error ?? t("aiError"));
        return;
      }

      setData((await res.json()) as AiJournalAnalysisResponse);
    } catch {
      setError(t("aiError"));
    } finally {
      setLoading(false);
    }
  }

  const disabled = loading || cooldown > 0 || tradeCount === 0;

  return (
    <section className="space-y-4 rounded-lg border border-border/70 bg-card/45 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="size-4" aria-hidden />
          </div>
          <div>
            <h2 className="font-heading text-base font-semibold text-foreground">
              {t("aiTitle")}
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              {t("aiDescription")}
            </p>
          </div>
        </div>
        <Button onClick={analyze} disabled={disabled} size="sm" className="w-fit">
          {loading ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              {t("aiAnalyzing")}
            </>
          ) : cooldown > 0 ? (
            t("aiRetryIn", { seconds: cooldown })
          ) : (
            <>
              <Sparkles className="size-3.5" />
              {data ? t("aiAnalyzeAgain") : t("aiAnalyze")}
            </>
          )}
        </Button>
      </div>

      {tradeCount === 0 && (
        <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          {t("aiEmptyHint")}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {data && (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[160px_1fr]">
            <div className="rounded-lg border border-border/60 bg-background/70 p-4">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                {t("aiScore")}
              </p>
              <div className="mt-2 flex items-end gap-1">
                <span className="font-heading text-4xl font-semibold text-foreground">
                  {Math.round(data.analysis.score)}
                </span>
                <span className="pb-1 text-sm text-muted-foreground">/100</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {t("aiTradeScope", {
                  total: data.tradeCount,
                  closed: data.closedTradeCount,
                })}
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/70 p-4">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                {t("aiSummary")}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-foreground">
                {data.analysis.summary}
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-border/60 bg-background/70 p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <CheckCircle2 className="size-4 text-emerald-600" aria-hidden />
                {t("aiStrengths")}
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {data.analysis.strengths.map((item) => (
                  <li key={item} className="leading-relaxed">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/70 p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <AlertTriangle className="size-4 text-amber-600" aria-hidden />
                {t("aiRiskFlags")}
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {data.analysis.riskFlags.map((item) => (
                  <li key={item} className="leading-relaxed">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-background/70 p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Target className="size-4 text-primary" aria-hidden />
              {t("aiImprovements")}
            </h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {data.analysis.improvementAreas.map((item) => (
                <div key={`${item.priority}-${item.title}`} className="rounded-lg border border-border/60 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <Badge variant={priorityVariant(item.priority)}>
                      {t(`aiPriority_${item.priority}`)}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {item.evidence}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-foreground">
                    {item.action}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-border/60 bg-background/70 p-4">
              <h3 className="text-sm font-semibold text-foreground">
                {t("aiPatterns")}
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {data.analysis.patternInsights.map((item) => (
                  <li key={item} className="leading-relaxed">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/70 p-4">
              <h3 className="text-sm font-semibold text-foreground">
                {t("aiReviewPlan")}
              </h3>
              <ol className="mt-3 list-decimal space-y-2 pl-4 text-sm text-muted-foreground">
                {data.analysis.nextReviewPlan.map((item) => (
                  <li key={item} className="leading-relaxed">
                    {item}
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground">
            {data.disclaimer}
          </p>
        </div>
      )}
    </section>
  );
}
