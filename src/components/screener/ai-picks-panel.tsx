"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Sparkles, AlertCircle, Loader2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { AiPickResult, AiPicksResponse, AiPicksError } from "@/app/api/screener/ai-picks/route";

function priceDecimals(p: number): number {
  if (p >= 10_000) return 1;
  if (p >= 100) return 2;
  if (p >= 10) return 3;
  return 4;
}

function QualityBar({ score }: { score: number }) {
  const color =
    score >= 70
      ? "bg-emerald-500"
      : score >= 50
        ? "bg-amber-500"
        : "bg-red-500";
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1.5 flex-1 rounded-full bg-muted/50">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${score}%` }}
        />
      </div>
      <span
        className={cn(
          "text-xs font-bold tabular-nums w-7 text-right",
          score >= 70
            ? "text-emerald-500"
            : score >= 50
              ? "text-amber-500"
              : "text-red-500",
        )}
      >
        {score}
      </span>
    </div>
  );
}

function ConfidenceStars({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={cn(
            "text-[10px]",
            i < value ? "text-amber-400" : "text-muted-foreground/25",
          )}
        >
          ★
        </span>
      ))}
    </div>
  );
}

function PickCard({ pick, t }: { pick: AiPickResult; t: ReturnType<typeof useTranslations<"screener">> }) {
  const isLong = pick.direction === "LONG";
  const dec = priceDecimals(pick.price);

  return (
    <div
      className={cn(
        "rounded-lg border border-border/70 bg-card flex flex-col gap-2.5 p-3.5",
        "border-l-[3px]",
        isLong ? "border-l-emerald-500" : "border-l-red-500",
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="font-mono font-bold text-base text-foreground">
            {pick.symbol}
          </span>
          <span className="ml-1.5 text-xs text-muted-foreground truncate">
            {pick.name}
          </span>
        </div>
        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-[11px] font-bold shrink-0",
            isLong
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
              : "bg-red-500/15 text-red-500",
          )}
        >
          {isLong ? "▲ LONG" : "▼ SHORT"}
        </span>
      </div>

      {/* Quality + confidence */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{t("aiPicksQuality")}</span>
          <ConfidenceStars value={pick.confidence} />
        </div>
        <QualityBar score={pick.qualityScore} />
      </div>

      {/* Aligned timeframes */}
      <div className="flex gap-1 flex-wrap">
        {["M15", "H1", "H4", "D1"].map((tf) => {
          const aligned = pick.alignedTimeframes.includes(tf);
          return (
            <span
              key={tf}
              className={cn(
                "text-[10px] font-medium rounded px-1.5 py-0.5",
                aligned
                  ? isLong
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-red-500/10 text-red-500"
                  : "bg-muted/30 text-muted-foreground/40",
              )}
            >
              {tf} {aligned ? "✓" : "–"}
            </span>
          );
        })}
      </div>

      {/* Entry / SL / TP */}
      <div className="grid grid-cols-3 gap-1 text-xs bg-muted/30 rounded p-2">
        <div>
          <div className="text-muted-foreground">{t("aiPicksEntry")}</div>
          <div className="font-mono font-semibold">{pick.entry.toFixed(dec)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">SL</div>
          <div className="font-mono font-semibold text-red-500">
            {pick.stopLoss.toFixed(dec)}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">TP</div>
          <div className="font-mono font-semibold text-emerald-500">
            {pick.takeProfit.toFixed(dec)}
          </div>
        </div>
      </div>

      {/* Checklist summary */}
      <div className="space-y-0.5">
        {pick.checklist.slice(0, 4).map((item, i) => (
          <div key={i} className="flex items-start gap-1.5">
            <span
              className={cn(
                "mt-0.5 text-[10px] font-bold shrink-0",
                item.status === "pass"
                  ? "text-emerald-500"
                  : item.status === "warn"
                    ? "text-amber-500"
                    : "text-red-500",
              )}
            >
              {item.status === "pass" ? "✓" : item.status === "warn" ? "⚠" : "✗"}
            </span>
            <span className="text-[11px] text-muted-foreground leading-relaxed line-clamp-1">
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {/* Reasoning */}
      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
        {pick.reasoning}
      </p>

      {/* Footer link */}
      <Link
        href={`/chart?symbol=${pick.symbol}`}
        className="text-xs text-primary hover:underline self-start mt-auto"
      >
        {t("viewChart")} →
      </Link>
    </div>
  );
}

type FetchState =
  | { status: "loading" }
  | { status: "done"; data: AiPicksResponse }
  | { status: "unavailable" }
  | { status: "error" };

export function AiPicksPanel() {
  const locale = useLocale();
  const t = useTranslations("screener");
  const [state, setState] = useState<FetchState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/screener/ai-picks?locale=${locale}`)
      .then(async (res) => {
        if (res.status === 503) {
          const body = (await res.json()) as AiPicksError;
          if (body.error === "ai_unavailable") throw new Error("unavailable");
        }
        if (!res.ok) throw new Error("error");
        return res.json() as Promise<AiPicksResponse>;
      })
      .then((data) => {
        if (!cancelled) setState({ status: "done", data });
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            status: err.message === "unavailable" ? "unavailable" : "error",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [locale]);

  if (state.status === "loading") {
    return (
      <div className="rounded-lg border border-border/60 bg-muted/10 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary/60" />
          <span className="text-sm font-medium text-muted-foreground">
            {t("aiPicksTitle")}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-lg border border-border/40 bg-muted/20 h-52 animate-pulse"
            />
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <Loader2 className="size-3 animate-spin text-muted-foreground/50" />
          <span className="text-xs text-muted-foreground/60">
            {t("aiPicksLoading")}
          </span>
        </div>
      </div>
    );
  }

  if (state.status === "unavailable") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-dashed border-border/60 bg-muted/10 p-3.5">
        <AlertCircle className="size-4 text-muted-foreground/50 shrink-0" />
        <p className="text-xs text-muted-foreground">{t("aiPicksUnavailable")}</p>
      </div>
    );
  }

  if (state.status === "error") return null;

  const { picks } = state.data;

  if (picks.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-dashed border-border/60 bg-muted/10 p-3.5">
        <Sparkles className="size-4 text-muted-foreground/40 shrink-0" />
        <p className="text-xs text-muted-foreground">{t("aiPicksNone")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">
          {t("aiPicksTitle")}
        </span>
        <span className="text-xs text-muted-foreground">
          · {picks.length} {t("aiPicksCount")}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {picks.map((pick) => (
          <PickCard key={pick.symbol} pick={pick} t={t} />
        ))}
      </div>

      <p className="text-xs text-muted-foreground/50">{t("aiPicksDisclaimer")}</p>
    </div>
  );
}
