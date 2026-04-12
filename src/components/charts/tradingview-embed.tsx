"use client";

import { useMemo } from "react";
import { toTradingViewSymbol } from "@/lib/quotes/tradingview-symbols";

interface Props {
  symbol?: string;
  locale?: string;
}

export function TradingViewEmbed({ symbol = "EURUSD", locale = "vi_VN" }: Props) {
  const tvSymbol = useMemo(() => toTradingViewSymbol(symbol), [symbol]);

  const src = `https://www.tradingview.com/widgetembed/?frameElementId=tradingview_chart&symbol=${encodeURIComponent(tvSymbol)}&interval=60&hidesidetoolbar=0&theme=dark&style=1&toolbar_bg=%230a0a0a&locale=${locale}`;

  return (
    <div className="h-[560px] w-full overflow-hidden rounded-lg border border-border bg-zinc-950 lg:h-full lg:min-h-[560px]">
      <iframe
        key={tvSymbol}
        className="h-full w-full border-0"
        src={src}
        title={`TradingView — ${symbol}`}
        allow="clipboard-write"
      />
    </div>
  );
}
