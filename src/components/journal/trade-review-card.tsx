"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Sparkles, RefreshCw, CheckCircle2, AlertTriangle, Flag, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AiTradeReviewResponse, AiTradeReviewResult } from "@/lib/ai/types";

const VERDICT_STYLE: Record<AiTradeReviewResult["verdict"], string> = {
  disciplined: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  acceptable: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400",
  undisciplined: "bg-red-500/15 text-red-600 dark:text-red-400",
};

function scoreColor(score: number) {
  if (score >= 75) return "text-emerald-500";
  if (score >= 45) return "text-yellow-500";
  return "text-red-500";
}

export function TradeReviewCard({
  tradeId,
  symbol,
  direction,
  autoLoad = false,
}: {
  tradeId: string;
  symbol: string;
  direction: string;
  autoLoad?: boolean;
}) {
  const t = useTranslations("journal");
  const [review, setReview] = useState<AiTradeReviewResult | null>(null);
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(autoLoad);

  const load = useCallback(
    async (refresh = false) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/journal/trade-review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tradeId, refresh }),
        });
        const data = (await res.json()) as AiTradeReviewResponse | { error?: string };
        if (!res.ok || !("review" in data)) {
          setError(("error" in data && data.error) || t("tradeReviewError"));
          return;
        }
        setReview(data.review);
        setCachedAt(data.cached ? data.generatedAt : null);
      } catch {
        setError(t("tradeReviewError"));
      } finally {
        setLoading(false);
      }
    },
    [tradeId, t],
  );

  useEffect(() => {
    if (started && !review && !loading && !error) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  if (!started) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-auto gap-1.5 px-2.5 py-1 text-xs"
        onClick={() => setStarted(true)}
      >
        <Sparkles className="size-3.5" />
        {t("tradeReviewButton")}
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/[0.03] p-4 text-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="flex items-center gap-1.5 font-medium">
          <Sparkles className="size-4 text-primary" />
          {t("tradeReviewTitle", { symbol, direction })}
        </p>
        {review && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-auto shrink-0 gap-1.5 px-2 py-1 text-xs text-muted-foreground"
            disabled={loading}
            onClick={() => load(true)}
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
            {t("tradeReviewRegenerate")}
          </Button>
        )}
      </div>

      <p className="mt-1 text-xs text-muted-foreground">{t("tradeReviewIntro")}</p>

      {loading && !review && (
        <p className="mt-3 flex items-center gap-2 text-muted-foreground">
          <RefreshCw className="size-4 animate-spin" />
          {t("tradeReviewLoading")}
        </p>
      )}

      {error && !loading && (
        <div className="mt-3 space-y-2">
          <p className="text-red-500">{error}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => load()}>
            {t("tradeReviewRegenerate")}
          </Button>
        </div>
      )}

      {review && (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className={cn("text-2xl font-bold tabular-nums", scoreColor(review.score))}>
              {review.score}
              <span className="text-sm font-normal text-muted-foreground">/100</span>
            </span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-medium",
                VERDICT_STYLE[review.verdict],
              )}
            >
              {t(
                review.verdict === "disciplined"
                  ? "tradeReviewVerdictDisciplined"
                  : review.verdict === "acceptable"
                    ? "tradeReviewVerdictAcceptable"
                    : "tradeReviewVerdictUndisciplined",
              )}
            </span>
            {cachedAt && (
              <span className="text-[11px] text-muted-foreground">
                {t("tradeReviewCached", {
                  time: new Date(cachedAt).toLocaleString(),
                })}
              </span>
            )}
          </div>

          <p>{review.summary}</p>

          {review.wentRight.length > 0 && (
            <ReviewList
              icon={<CheckCircle2 className="size-3.5 text-emerald-500" />}
              title={t("tradeReviewWentRight")}
              items={review.wentRight}
            />
          )}
          {review.wentWrong.length > 0 && (
            <ReviewList
              icon={<AlertTriangle className="size-3.5 text-yellow-500" />}
              title={t("tradeReviewWentWrong")}
              items={review.wentWrong}
            />
          )}
          {review.disciplineFlags.length > 0 && (
            <ReviewList
              icon={<Flag className="size-3.5 text-red-500" />}
              title={t("tradeReviewFlags")}
              items={review.disciplineFlags}
            />
          )}

          <div className="flex items-start gap-2 rounded-md bg-muted/50 p-2.5">
            <ArrowRight className="mt-0.5 size-4 shrink-0 text-primary" />
            <p>
              <span className="font-medium">{t("tradeReviewNextAction")}: </span>
              {review.nextAction}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewList({
  icon,
  title,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon}
        {title}
      </p>
      <ul className="mt-1 space-y-1 pl-5">
        {items.map((item, i) => (
          <li key={i} className="list-disc text-sm">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
