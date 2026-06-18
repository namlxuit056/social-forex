import { CircleDollarSign, History, RadioTower } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { PublicPerformanceChart } from "./public-performance-chart";
import { TradeHistoryPaginated } from "./trade-history-paginated";

type Translator = (key: string) => string;

type LivePosition = {
  ticket: string;
  symbol: string;
  type: string;
  volume: number | null;
  priceOpen: number | null;
  priceCurrent: number | null;
  profit: number | null;
};

function fmtCurrency(v: number) {
  const sign = v >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(v).toFixed(2)}`;
}

function numberOrNull(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseLivePositions(value: unknown): LivePosition[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((position) => {
    if (!position || typeof position !== "object") return [];
    const row = position as Record<string, unknown>;
    const ticket = row.ticket != null ? String(row.ticket) : null;
    const symbol = typeof row.symbol === "string" ? row.symbol : null;
    const type = typeof row.type === "string" ? row.type : null;
    if (!ticket || !symbol || !type) return [];

    return [
      {
        ticket,
        symbol,
        type,
        volume: numberOrNull(row.volume),
        priceOpen: numberOrNull(row.priceOpen),
        priceCurrent: numberOrNull(row.priceCurrent),
        profit: numberOrNull(row.profit),
      },
    ];
  });
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
  const [trades, mt5Connection, latestSnapshot] = await Promise.all([
    prisma.tradeJournal.findMany({
      where: { userId: profileUserId },
      orderBy: { openedAt: "desc" },
      take: 120,
    }),
    prisma.mt5Connection.findFirst({
      where: { userId: profileUserId, revokedAt: null },
      orderBy: { lastSeenAt: "desc" },
      select: {
        name: true,
        accountCurrency: true,
        balance: true,
        equity: true,
        openPositions: true,
        lastSeenAt: true,
      },
    }),
    prisma.mt5Snapshot.findFirst({
      where: { connection: { userId: profileUserId, revokedAt: null } },
      orderBy: { receivedAt: "desc" },
      select: { positions: true },
    }),
  ]);

  const livePositions = parseLivePositions(latestSnapshot?.positions);

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

  if (trades.length === 0 && livePositions.length === 0 && !mt5Connection) return null;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
            {t("tradingOverviewTitle")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("tradingOverviewHint")}</p>
        </div>
        {mt5Connection?.lastSeenAt ? (
          <p className="text-xs text-muted-foreground">
            {t("liveLastSeen")}{" "}
            {mt5Connection.lastSeenAt.toLocaleString(locale === "vi" ? "vi-VN" : "en-US", {
              month: "numeric",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        ) : null}
      </div>

      <PublicPerformanceChart trades={serializedTrades} locale={locale} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-border/60 bg-card/55">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <RadioTower className="size-4 text-emerald-500" />
              {t("profileLiveTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mt5Connection ? (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md bg-muted/25 px-2 py-1.5">
                  <p className="text-muted-foreground">{t("profileBalance")}</p>
                  <p className="font-mono text-foreground">
                    {mt5Connection.balance == null ? "—" : `${mt5Connection.balance.toFixed(2)} ${mt5Connection.accountCurrency ?? ""}`}
                  </p>
                </div>
                <div className="rounded-md bg-muted/25 px-2 py-1.5">
                  <p className="text-muted-foreground">{t("profileEquity")}</p>
                  <p className="font-mono text-foreground">
                    {mt5Connection.equity == null ? "—" : `${mt5Connection.equity.toFixed(2)} ${mt5Connection.accountCurrency ?? ""}`}
                  </p>
                </div>
              </div>
            ) : null}
            {livePositions.length === 0 ? (
              <p className="rounded-md border border-dashed border-border/70 px-3 py-4 text-sm text-muted-foreground">
                {t("profileNoLivePositions")}
              </p>
            ) : (
              <div className="space-y-2">
                {livePositions.slice(0, 5).map((position) => (
                  <div key={position.ticket} className="rounded-md border border-border/60 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-mono text-sm font-semibold text-foreground">
                        {position.symbol} {position.type}
                      </div>
                      <span className={cn("font-mono text-xs", (position.profit ?? 0) >= 0 ? "text-emerald-500" : "text-red-500")}>
                        {position.profit == null ? "—" : fmtCurrency(position.profit)}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                      <span>{t("profileLot")}: {position.volume ?? "—"}</span>
                      <span>{t("profileEntry")}: {position.priceOpen ?? "—"}</span>
                      <span>{t("profileCurrent")}: {position.priceCurrent ?? "—"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

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
      </div>

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
            <TradeHistoryPaginated trades={serializedTradeRows} locale={locale} t={t} />
          )}
        </CardContent>
      </Card>
    </section>
  );
}
