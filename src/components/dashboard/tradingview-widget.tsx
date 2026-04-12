"use client";

/**
 * Widget embed TradingView (không cần API key; tuân điều khoản TradingView).
 * Symbol: NEXT_PUBLIC_TRADINGVIEW_SYMBOL (vd. OANDA:EURUSD).
 */
export function DashboardTradingViewWidget() {
  const raw =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_TRADINGVIEW_SYMBOL
      ? process.env.NEXT_PUBLIC_TRADINGVIEW_SYMBOL
      : "OANDA:EURUSD";
  const symbol = encodeURIComponent(raw);
  const src = `https://www.tradingview.com/widgetembed/?frameElementId=tradingview_dash&symbol=${symbol}&interval=60&hidesidetoolbar=0&theme=dark&style=1&toolbar_bg=%230a0a0a&locale=vi_VN`;

  return (
    <div className="h-[min(420px,50vh)] min-h-[320px] w-full overflow-hidden rounded-xl border border-border bg-background ring-1 ring-foreground/5">
      <iframe
        className="h-full w-full border-0"
        src={src}
        title="TradingView — biểu đồ nhanh"
        allow="clipboard-write"
      />
    </div>
  );
}
