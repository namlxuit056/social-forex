/** Biểu đồ TradingView qua widget embed — không cần API key. */

export function TradingViewEmbed() {
  const src =
    "https://www.tradingview.com/widgetembed/?frameElementId=tradingview_chart&symbol=OANDA%3AEURUSD&interval=60&hidesidetoolbar=0&theme=dark&style=1&toolbar_bg=%230a0a0a&locale=vi_VN";
  return (
    <div className="h-[560px] w-full overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
      <iframe
        className="h-full w-full border-0"
        src={src}
        title="TradingView — EURUSD"
        allow="clipboard-write"
      />
    </div>
  );
}
