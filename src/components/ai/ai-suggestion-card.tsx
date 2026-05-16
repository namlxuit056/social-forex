"use client";

import { useTranslations } from "next-intl";
import {
  TrendingUp,
  TrendingDown,
  Shield,
  Target,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  CircleAlert,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AiSuggestResponse } from "@/lib/ai/types";
import type { TradingViewTechnicalFrame } from "@/lib/ai/tradingview-context";

function ConfidenceStars({ level }: { level: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={cn(
            "text-sm",
            i < level ? "text-yellow-500" : "text-muted-foreground/30",
          )}
        >
          ★
        </span>
      ))}
    </span>
  );
}

function formatPrice(value: number): string {
  if (value >= 100) return value.toFixed(2);
  if (value >= 1) return value.toFixed(4);
  return value.toFixed(5);
}

function riskRewardRatio({
  direction,
  entry,
  stopLoss,
  takeProfit,
}: {
  direction: "LONG" | "SHORT";
  entry: number;
  stopLoss: number;
  takeProfit: number;
}): string {
  const risk =
    direction === "LONG" ? entry - stopLoss : stopLoss - entry;
  const reward =
    direction === "LONG" ? takeProfit - entry : entry - takeProfit;

  if (risk <= 0 || reward <= 0) return "—";
  return `1:${(reward / risk).toFixed(2)}`;
}

function formatMetric(value: number | null, digits = 1): string {
  if (value === null) return "n/a";
  return value.toFixed(digits);
}

function scoreClass(score: number) {
  if (score >= 75) return "text-emerald-600 dark:text-emerald-300";
  if (score >= 55) return "text-yellow-600 dark:text-yellow-300";
  return "text-red-600 dark:text-red-300";
}

function checklistClass(status: "pass" | "warn" | "fail") {
  if (status === "pass") {
    return "border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300";
  }
  if (status === "warn") {
    return "border-yellow-500/25 bg-yellow-500/5 text-yellow-700 dark:text-yellow-300";
  }
  return "border-red-500/25 bg-red-500/5 text-red-700 dark:text-red-300";
}

function ChecklistIcon({ status }: { status: "pass" | "warn" | "fail" }) {
  if (status === "pass") {
    return <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" aria-hidden />;
  }
  if (status === "warn") {
    return <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />;
  }
  return <XCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />;
}

function TrendPill({ frame }: { frame: TradingViewTechnicalFrame }) {
  const trendClass =
    frame.trend === "bullish"
      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : frame.trend === "bearish"
        ? "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300"
        : "border-border bg-muted/60 text-muted-foreground";

  return (
    <div className={cn("rounded-md border px-2 py-1.5", trendClass)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase">
          {frame.timeframe}
        </span>
        <span className="text-[10px] capitalize">{frame.trend}</span>
      </div>
      <div className="mt-1 text-[10px] leading-relaxed opacity-90">
        RSI {formatMetric(frame.rsi)} · EMA {frame.emaBias}
      </div>
      <div className="mt-0.5 line-clamp-1 text-[10px] opacity-80">
        {frame.candlePattern}
      </div>
    </div>
  );
}

interface Props {
  data: AiSuggestResponse;
  onPostSignal?: () => void;
  showPostButton?: boolean;
  postPending?: boolean;
}

export function AiSuggestionCard({
  data,
  onPostSignal,
  showPostButton,
  postPending,
}: Props) {
  const t = useTranslations("ai");
  const { suggestion, symbol, disclaimer } = data;
  const isLong = suggestion.direction === "LONG";
  const rr = riskRewardRatio(suggestion);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
      {/* Header */}
      <div
        className={cn(
          "flex items-center justify-between px-4 py-3",
          isLong
            ? "bg-emerald-500/10 dark:bg-emerald-500/5"
            : "bg-red-500/10 dark:bg-red-500/5",
        )}
      >
        <div className="flex items-center gap-2">
          {isLong ? (
            <TrendingUp className="size-5 text-emerald-500" />
          ) : (
            <TrendingDown className="size-5 text-red-500" />
          )}
          <div>
            <h3 className="text-sm font-bold text-foreground">
              {t("title")} — {symbol}
            </h3>
            <span
              className={cn(
                "text-xs font-semibold",
                isLong ? "text-emerald-500" : "text-red-500",
              )}
            >
              {isLong ? t("long") : t("short")}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {t("confidence")}
          </div>
          <ConfidenceStars level={suggestion.confidence} />
          <div className={cn("mt-0.5 text-xs font-bold", scoreClass(suggestion.qualityScore))}>
            {suggestion.qualityScore}/100
          </div>
        </div>
      </div>

      {/* Price levels */}
      <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
        <PriceCell
          icon={<Target className="size-3.5 text-blue-500" />}
          label={t("entry")}
          value={formatPrice(suggestion.entry)}
        />
        <PriceCell
          icon={<Shield className="size-3.5 text-red-500" />}
          label={t("stopLoss")}
          value={formatPrice(suggestion.stopLoss)}
          className="text-red-500"
        />
        <PriceCell
          icon={<Target className="size-3.5 text-emerald-500" />}
          label={t("takeProfit")}
          value={formatPrice(suggestion.takeProfit)}
          className="text-emerald-500"
        />
      </div>

      {/* Key levels */}
      {suggestion.keyLevels && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border px-4 py-2">
          <span className="text-[10px] font-medium uppercase text-muted-foreground">
            {t("keyLevels")}
          </span>
          <span className="text-xs text-muted-foreground">
            {t("support")}:{" "}
            <strong className="text-foreground">
              {formatPrice(suggestion.keyLevels.support)}
            </strong>
          </span>
          <span className="text-xs text-muted-foreground">
            {t("resistance")}:{" "}
            <strong className="text-foreground">
              {formatPrice(suggestion.keyLevels.resistance)}
            </strong>
          </span>
          <span className="text-xs text-muted-foreground">
            {t("riskReward")}:{" "}
            <strong className="text-foreground">{rr}</strong>
          </span>
        </div>
      )}

      <div className="border-b border-border px-4 py-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase text-muted-foreground">
            {t("tradeChecklist")}
          </span>
          <span className={cn("text-xs font-bold", scoreClass(suggestion.qualityScore))}>
            {t("qualityScore")}: {suggestion.qualityScore}/100
          </span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {suggestion.tradeChecklist.map((item) => (
            <div
              key={`${item.label}-${item.status}`}
              className={cn(
                "flex gap-2 rounded-md border px-2.5 py-2",
                checklistClass(item.status),
              )}
            >
              <ChecklistIcon status={item.status} />
              <div className="min-w-0">
                <div className="text-[11px] font-semibold leading-snug">
                  {item.label}
                </div>
                <div className="mt-0.5 text-[10px] leading-relaxed opacity-85">
                  {item.detail}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {data.technicalContext && (
        <div className="border-b border-border bg-muted/20 px-4 py-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase text-muted-foreground">
              {t("tradingViewContext")}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {data.technicalContext.tradingViewSymbol}
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {data.technicalContext.frames.map((frame) => (
              <TrendPill key={frame.timeframe} frame={frame} />
            ))}
          </div>
        </div>
      )}

      {/* Reasoning */}
      <div className="px-4 py-3">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t("reasoning")}
        </div>
        <p className="text-xs leading-relaxed text-foreground/90">
          {suggestion.reasoning}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-start gap-2 border-t border-border bg-muted/30 px-4 py-2.5">
        <AlertTriangle className="mt-0.5 size-3 shrink-0 text-yellow-600" />
        <p className="flex-1 text-[10px] leading-relaxed text-muted-foreground">
          {disclaimer}
        </p>
        {showPostButton && onPostSignal && (
          <button
            onClick={onPostSignal}
            disabled={postPending}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-70"
          >
            {postPending ? (
              <>
                <Loader2 className="size-3 animate-spin" aria-hidden />
                {t("postingSignal")}
              </>
            ) : (
              t("postSignal")
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function PriceCell({
  icon,
  label,
  value,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="px-4 py-3 text-center">
      <div className="mb-1 flex items-center justify-center gap-1">
        {icon}
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
      <span className={cn("text-sm font-bold tabular-nums", className)}>
        {value}
      </span>
    </div>
  );
}
