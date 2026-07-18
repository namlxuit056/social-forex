"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { TRADE_SETUPS, type TradeSetup } from "@/lib/journal/setups";

/** Map setup → label đã dịch, dùng chung cho form/table/edge analytics. */
export function useSetupLabels(): Record<TradeSetup, string> {
  const t = useTranslations("journal");
  return useMemo(
    () => ({
      BREAKOUT: t("setupBreakout"),
      PULLBACK: t("setupPullback"),
      TREND: t("setupTrend"),
      REVERSAL: t("setupReversal"),
      RANGE: t("setupRange"),
      NEWS: t("setupNews"),
      SCALP: t("setupScalp"),
      OTHER: t("setupOther"),
    }),
    [t],
  );
}

export { TRADE_SETUPS };
