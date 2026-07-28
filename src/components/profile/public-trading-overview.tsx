import { CircleDollarSign, History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { PublicPerformanceChart } from "./public-performance-chart";
import { TradeHistoryPaginated } from "./trade-history-paginated";

type Translator = (key: string) => string;

function fmtCurrency(v: number) {
  const sign = v >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(v).toFixed(2)}`;
}

export async function PublicTradingOverview({
  profileUserId,
  locale,
  t,
}: {
  profileUserId: string;
  locale: string;
  t: Translator;
}) {
  const trades = await prisma.tradeJournal.findMany({
    where: { userId: profileUserId },
    orderBy: { openedAt: "desc" },
    take: 120,
  });

  const serializedTrades = trades.map((trade) => ({
    pnl: trade.pnl,
    result: trade.result,
    closedAt: trade.closedAt?.toISOString() ?? null,
    openedAt: trade.openedAt.toISOString(),
  }));

  const serializedTradeRows = trades.map((trade) => ({
    id: trade.id,
    symbol: trade.symbol,
    direction: trade.direction,
    result: trade.result,
    pnl: trade.pnl,
    openedAt: trade.openedAt.toISOString(),
  }));

  const symbolRows = Array.from(
    trades.reduce((map, trade) => {
      const key = trade.symbol.toUpperCase();
      const current = map.get(key) ?? { symbol: key, count: 0, pnl: 0 };
      current.count += 1;
      current.pnl += trade.pnl ?? 0;
      map.set(key, current);
      return map;
    }, new Map<string, { symbol: string; count: number; pnl: number }>()),
  )
    .map(([, value]) => value)
    .sort((a, b) => b.count - a.count || Math.abs(b.pnl) - Math.abs(a.pnl))
    .slice(0, 12);

  if (trades.length === 0) return null;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
          {t("tradingOverviewTitle")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("tradingOverviewHint")}</p>
      </div>

      <Card className="border-border/60 bg-card/55">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CircleDollarSign className="size-4 text-chart-4" />
            {t("profileSymbolsTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {symbolRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("profileSymbolsEmpty")}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {symbolRows.map((symbol) => (
                <Badge key={symbol.symbol} variant="outline" className="gap-1.5 px-2.5 py-1">
                  <span className="font-mono">{symbol.symbol}</span>
                  <span className="text-muted-foreground">{symbol.count}</span>
                  <span className={symbol.pnl >= 0 ? "text-emerald-500" : "text-red-500"}>
                    {fmtCurrency(symbol.pnl)}
                  </span>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <PublicPerformanceChart trades={serializedTrades} locale={locale} />

      <Card className="border-border/60 bg-card/55">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="size-4 text-muted-foreground" />
            {t("profileTradeHistoryTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {trades.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-muted-foreground">
              {t("profileTradeHistoryEmpty")}
            </p>
          ) : (
            <TradeHistoryPaginated
              trades={serializedTradeRows}
              locale={locale}
              labels={{
                symbol: t("profileSymbol"),
                direction: t("profileDirection"),
                result: t("profileResult"),
                pnl: t("profilePnl"),
                opened: t("profileOpened"),
                win: t("tradeResultWin"),
                loss: t("tradeResultLoss"),
                breakeven: t("tradeResultBreakeven"),
                pending: t("tradeResultPending"),
              }}
            />
          )}
        </CardContent>
      </Card>
    </section>
  );
}
