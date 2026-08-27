import { ExternalLink } from "lucide-react";
import { tradingViewChartUrl } from "@/lib/quotes/tradingview-symbols";
import { cn } from "@/lib/utils";

/** Symbol text that links out to the full TradingView chart in a new tab. */
export function SymbolChartLink({
  symbol,
  className,
}: {
  symbol: string;
  className?: string;
}) {
  return (
    <a
      href={tradingViewChartUrl(symbol)}
      target="_blank"
      rel="noopener noreferrer"
      title={`${symbol} — TradingView`}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "group/tv inline-flex items-center gap-1 underline-offset-2 hover:text-primary hover:underline",
        className,
      )}
    >
      {symbol}
      <ExternalLink className="size-3 shrink-0 opacity-0 transition-opacity group-hover/tv:opacity-70" />
    </a>
  );
}
