"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import { QUOTE_BY_SYMBOL } from "@/lib/quotes/definitions";
import { TradingViewEmbed } from "@/components/charts/tradingview-embed";
import { ChartWatchlist } from "@/components/charts/chart-watchlist";
import { AiAnalysisPanel } from "@/components/ai/ai-analysis-panel";

const DEFAULT_SYMBOL = "EURUSD";

interface Props {
  locale: string;
  /** When false, only watchlist + chart (e.g. dashboard). Chart page uses full layout + AI. */
  showAiPanel?: boolean;
}

function ChartContainerInner({ locale, showAiPanel = true }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const raw = searchParams.get("symbol")?.toUpperCase() ?? "";
  const symbol = QUOTE_BY_SYMBOL[raw] ? raw : DEFAULT_SYMBOL;

  const tvLocale = locale === "vi" ? "vi_VN" : "en";

  const handleSelect = useCallback(
    (s: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("symbol", s);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:gap-4">
        <ChartWatchlist activeSymbol={symbol} onSelect={handleSelect} />
        <div className="flex-1">
          <TradingViewEmbed symbol={symbol} locale={tvLocale} />
        </div>
      </div>
      {showAiPanel ? <AiAnalysisPanel symbol={symbol} /> : null}
    </div>
  );
}

export function ChartContainer({ locale, showAiPanel = true }: Props) {
  return (
    <SessionProvider>
      <ChartContainerInner locale={locale} showAiPanel={showAiPanel} />
    </SessionProvider>
  );
}
