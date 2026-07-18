"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { TRADE_SETUPS, type TradeSetup } from "@/lib/journal/setups";
import { TRADE_EMOTIONS, type TradeEmotion } from "@/lib/journal/emotions";

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

export function useEmotionLabels(): Record<TradeEmotion, string> {
  const t = useTranslations("journal");
  return useMemo(
    () => ({
      CALM: t("emotionCalm"),
      CONFIDENT: t("emotionConfident"),
      FOMO: t("emotionFomo"),
      REVENGE: t("emotionRevenge"),
      HESITANT: t("emotionHesitant"),
    }),
    [t],
  );
}

export { TRADE_SETUPS, TRADE_EMOTIONS };
