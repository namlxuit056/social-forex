"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2, ShieldAlert, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { tradeActionBadge } from "./trade-action-badge";
import type { AiPortfolioReviewResponse, AiSuggestError } from "@/lib/ai/types";

function riskLevelTone(level: "low" | "medium" | "high") {
  if (level === "high") return "border-destructive/30 bg-destructive/8 text-destructive";
  if (level === "medium") return "border-amber-500/30 bg-amber-500/8 text-amber-600 dark:text-amber-500";
  return "border-emerald-500/30 bg-emerald-500/8 text-emerald-600 dark:text-emerald-500";
}

export function PortfolioReviewPanel({ positionCount }: { positionCount: number }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AiPortfolioReviewResponse | null>(null);
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
      const res = await fetch("/api/ai/portfolio-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as AiSuggestError;
        if (res.status === 429 && body.retryAfterMs) startCooldown(body.retryAfterMs);
        setError(body.error ?? "Unable to review portfolio right now");
        return;
      }

      setData((await res.json()) as AiPortfolioReviewResponse);
    } catch {
      setError("Unable to review portfolio right now");
    } finally {
      setLoading(false);
    }
  }

  const disabled = loading || cooldown > 0 || positionCount === 0;

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldAlert className="size-4" aria-hidden />
          </div>
          <div>
            <h2 className="font-heading text-base font-semibold text-foreground">
              AI Portfolio Review
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Reviews all open positions together — correlated exposure, total risk vs equity, and a hold/trim/close call per position.
            </p>
          </div>
        </div>
        <Button onClick={analyze} disabled={disabled} size="sm" className="w-fit shrink-0">
          {loading ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Reviewing...
            </>
          ) : cooldown > 0 ? (
            `Retry in ${cooldown}s`
          ) : (
            <>
              <Sparkles className="size-3.5" />
              {data ? "Review Again" : "Review Portfolio"}
            </>
          )}
        </Button>
      </div>

      {positionCount === 0 && (
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          No open positions to review yet.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {data && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
            <div
              className={cn(
                "flex flex-col justify-center rounded-lg border px-4 py-3",
                riskLevelTone(data.review.overallRiskLevel),
              )}
            >
              <p className="text-xs font-medium uppercase opacity-80">Risk Level</p>
              <p className="mt-1 text-lg font-semibold capitalize">{data.review.overallRiskLevel}</p>
              <p className="mt-0.5 text-xs opacity-80">
                ~{data.review.totalExposurePct.toFixed(1)}% of equity at risk
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background/70 p-4">
              <p className="text-xs font-medium uppercase text-muted-foreground">Summary</p>
              <p className="mt-2 text-sm leading-relaxed text-foreground">{data.review.summary}</p>
            </div>
          </div>

          {data.review.correlationWarnings.length > 0 && (
            <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-500">
                <AlertTriangle className="size-4" aria-hidden />
                Correlation Warnings
              </h3>
              <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-muted-foreground">
                {data.review.correlationWarnings.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-lg border border-border bg-background/70 p-4">
            <h3 className="text-sm font-semibold text-foreground">Per-Position Advice</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {data.review.positionAdvice.map((item) => {
                const { icon: Icon, className } = tradeActionBadge(item.action);
                return (
                  <div
                    key={item.ticket}
                    className="flex items-start gap-3 rounded-lg border border-border p-3"
                  >
                    <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full border", className)}>
                      <Icon className="size-3.5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{item.symbol}</span>
                        <Badge variant="outline" className={cn("text-[10px] uppercase", className)}>
                          {item.action}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.reason}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground">{data.disclaimer}</p>
        </div>
      )}
    </section>
  );
}
