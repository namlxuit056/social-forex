"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { BarChart3, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  computeEdgeGroups,
  findBestRow,
  findWorstRow,
  type EdgeRow,
  type EdgeTrade,
} from "@/lib/journal/edge-stats";
import { computePlaybookAdherence } from "@/lib/journal/playbook-adherence";
import { useEmotionLabels, useSetupLabels } from "./use-setup-labels";

const MIN_CLOSED_TRADES = 5;

function EdgeGroupCard({
  title,
  rows,
  labelOf,
  worstKey,
  bestKey,
  notEnoughLabel,
}: {
  title: string;
  rows: EdgeRow[];
  labelOf: (key: string) => string;
  worstKey?: string | null;
  bestKey?: string | null;
  notEnoughLabel: string;
}) {
  if (rows.length === 0) return null;
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.slice(0, 8).map((r) => {
          const isWorst = worstKey != null && r.key === worstKey;
          const isBest = bestKey != null && r.key === bestKey;
          return (
            <div key={r.key} className="space-y-1">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span
                  className={cn(
                    "font-mono font-medium",
                    isWorst ? "text-red-500" : isBest ? "text-emerald-500" : "text-foreground",
                  )}
                >
                  {labelOf(r.key)}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {r.winRate !== null ? `${r.winRate}%` : notEnoughLabel}{" "}
                  · {r.wins}W/{r.losses}L ·{" "}
                  <span className={r.pnl >= 0 ? "text-emerald-500" : "text-red-500"}>
                    {r.pnl >= 0 ? "+" : "-"}${Math.abs(r.pnl).toFixed(2)}
                  </span>
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full",
                    (r.winRate ?? 0) >= 50 ? "bg-emerald-500" : "bg-red-500",
                  )}
                  style={{ width: `${r.winRate ?? 0}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function JournalEdgeAnalytics({ trades }: { trades: EdgeTrade[] }) {
  const t = useTranslations("journal");
  const setupLabels = useSetupLabels();
  const emotionLabels = useEmotionLabels();
  const groups = useMemo(() => computeEdgeGroups(trades), [trades]);
  const closedCount = trades.filter((tr) => tr.result !== "PENDING").length;

  const worstSymbol = findWorstRow(groups.symbols);
  const worstSession = findWorstRow(groups.sessions);
  const bestSetupRow = findBestRow(groups.setups);
  const playbookAdherence = bestSetupRow
    ? computePlaybookAdherence(trades, bestSetupRow.key)
    : null;

  if (closedCount < MIN_CLOSED_TRADES) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/60 bg-muted/20 px-6 py-12 text-center">
        <BarChart3 className="size-10 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">
          {t("edgeEmpty", { min: MIN_CLOSED_TRADES })}
        </p>
      </div>
    );
  }

  const sessionLabel = (key: string) =>
    key === "asia"
      ? t("sessionAsia")
      : key === "london"
        ? t("sessionLondon")
        : t("sessionNewYork");

  const sourceLabel = (key: string) =>
    key === "signal" ? t("sourceSignal") : t("sourceManual");

  const setupLabel = (key: string) =>
    setupLabels[key as keyof typeof setupLabels] ?? key;

  const emotionLabel = (key: string) =>
    emotionLabels[key as keyof typeof emotionLabels] ?? key;

  return (
    <div className="space-y-4">
      {worstSymbol && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-950/20 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>
            {t("edgeWorstHint", {
              label: worstSymbol.key,
              winRate: worstSymbol.winRate ?? 0,
              count: worstSymbol.wins + worstSymbol.losses,
            })}
            {worstSession &&
              ` ${t("edgeWorstSessionHint", {
                session: sessionLabel(worstSession.key),
                winRate: worstSession.winRate ?? 0,
              })}`}
          </p>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <EdgeGroupCard
          title={t("edgeBySymbol")}
          rows={groups.symbols}
          labelOf={(k) => k}
          worstKey={worstSymbol?.key}
          notEnoughLabel={t("edgeNotEnough")}
        />
        <EdgeGroupCard
          title={t("edgeBySession")}
          rows={groups.sessions}
          labelOf={sessionLabel}
          notEnoughLabel={t("edgeNotEnough")}
        />
        <EdgeGroupCard
          title={t("edgeByDirection")}
          rows={groups.directions}
          labelOf={(k) => k}
          notEnoughLabel={t("edgeNotEnough")}
        />
        <EdgeGroupCard
          title={t("edgeBySource")}
          rows={groups.sources}
          labelOf={sourceLabel}
          notEnoughLabel={t("edgeNotEnough")}
        />
        <EdgeGroupCard
          title={t("edgeBySetup")}
          rows={groups.setups}
          labelOf={setupLabel}
          worstKey={findWorstRow(groups.setups)?.key}
          bestKey={bestSetupRow?.key}
          notEnoughLabel={t("edgeNotEnough")}
        />
        <EdgeGroupCard
          title={t("edgeByEmotion")}
          rows={groups.emotions}
          labelOf={emotionLabel}
          worstKey={findWorstRow(groups.emotions)?.key}
          notEnoughLabel={t("edgeNotEnough")}
        />
      </div>

      {playbookAdherence &&
        playbookAdherence.onPlaybook.lossRate !== null &&
        playbookAdherence.offPlaybook.lossRate !== null && (
          <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/20 p-4 text-sm">
            <BarChart3 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <p>
              {t("playbookAdherenceHint", {
                setup: setupLabel(bestSetupRow!.key),
                offLossRate: playbookAdherence.offPlaybook.lossRate,
                offCount: playbookAdherence.offPlaybook.wins + playbookAdherence.offPlaybook.losses,
                onLossRate: playbookAdherence.onPlaybook.lossRate,
                onCount: playbookAdherence.onPlaybook.wins + playbookAdherence.onPlaybook.losses,
              })}
            </p>
          </div>
        )}

      <p className="text-xs text-muted-foreground">{t("edgeSessionNote")}</p>
    </div>
  );
}
