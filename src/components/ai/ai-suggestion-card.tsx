"use client";

import { useTranslations } from "next-intl";
import {
  TrendingUp,
  TrendingDown,
  Shield,
  Target,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AiSuggestResponse } from "@/lib/ai/types";

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

interface Props {
  data: AiSuggestResponse;
  onPostSignal?: () => void;
  showPostButton?: boolean;
}

export function AiSuggestionCard({
  data,
  onPostSignal,
  showPostButton,
}: Props) {
  const t = useTranslations("ai");
  const { suggestion, symbol, disclaimer } = data;
  const isLong = suggestion.direction === "LONG";

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
        <div className="flex items-center gap-4 border-b border-border px-4 py-2">
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
            className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            {t("postSignal")}
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
