import { BarChart3, CircleDollarSign, History, RadioTower } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

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

const SVG_WIDTH = 760;
const SVG_HEIGHT = 220;
const CHART_TOP = 18;
const CHART_RIGHT = 18;
const CHART_BOTTOM = 34;
const CHART_LEFT = 48;
const CHART_WIDTH = SVG_WIDTH - CHART_LEFT - CHART_RIGHT;
const CHART_HEIGHT = SVG_HEIGHT - CHART_TOP - CHART_BOTTOM;

function numberOrNull(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatCurrency(value: number) {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(value).toFixed(2)}`;
}

function formatPercent(value: number) {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}${Math.abs(value).toFixed(2)}%`;
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

function performancePoints(trades: { closedAt: Date | null; openedAt: Date; pnl: number | null; result: string }[]) {
  const closed = trades
    .filter((trade) => trade.result !== "PENDING")
    .sort((a, b) => (a.closedAt ?? a.openedAt).getTime() - (b.closedAt ?? b.openedAt).getTime());

  let cumulative = 0;
  return closed.map((trade, index) => {
    cumulative += trade.pnl ?? 0;
    return {
      index,
      pnl: cumulative,
      label: (trade.closedAt ?? trade.openedAt).toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
      }),
    };
  });
}

function chartPath(points: { index: number; pnl: number }[]) {
  if (points.length === 0) return { path: "", zeroY: CHART_TOP + CHART_HEIGHT / 2, maxAbs: 1 };

  const maxAbs = Math.max(1, ...points.map((point) => Math.abs(point.pnl)));
  const zeroY = CHART_TOP + CHART_HEIGHT / 2;
  const xStep = points.length > 1 ? CHART_WIDTH / (points.length - 1) : 0;
  const yFor = (value: number) => zeroY - (value / maxAbs) * (CHART_HEIGHT / 2);

  const path = points
    .map((point, index) => {
      const x = CHART_LEFT + index * xStep;
      const y = yFor(point.pnl);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  return { path, zeroY, maxAbs };
}

function resultClass(result: string) {
  if (result === "WIN") return "border-emerald-500/40 bg-emerald-500/15 text-emerald-300";
  if (result === "LOSS") return "border-red-500/40 bg-red-500/15 text-red-300";
  if (result === "BREAKEVEN") return "border-amber-500/40 bg-amber-500/15 text-amber-200";
  return "border-sky-500/40 bg-sky-500/15 text-sky-200";
}

function resultLabel(result: string, t: Translator) {
  if (result === "WIN") return t("tradeResultWin");
  if (result === "LOSS") return t("tradeResultLoss");
  if (result === "BREAKEVEN") return t("tradeResultBreakeven");
  return t("tradeResultPending");
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
  const [trades, mt5Connection] = await Promise.all([
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
        lastPositions: true,
      },
    }),
  ]);

  const livePositions = parseLivePositions(mt5Connection?.lastPositions);
  const closedTrades = trades.filter((trade) => trade.result !== "PENDING");
  const wins = closedTrades.filter((trade) => trade.result === "WIN").length;
  const losses = closedTrades.filter((trade) => trade.result === "LOSS").length;
  const totalPnl = closedTrades.reduce((sum, trade) => sum + (trade.pnl ?? 0), 0);
  const accountBase = mt5Connection?.balance ?? mt5Connection?.equity ?? null;
  const accountPercent = accountBase && accountBase > 0 ? (totalPnl / accountBase) * 100 : null;
  const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;
  const points = performancePoints(trades);
  const chart = chartPath(points);

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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/60 bg-card/55">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t("overviewNetPnl")}</p>
            <p className={cn("mt-1 font-mono text-2xl font-semibold", totalPnl >= 0 ? "text-emerald-500" : "text-red-500")}>
              {formatCurrency(totalPnl)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/55">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t("overviewAccountPercent")}</p>
            <p className={cn("mt-1 font-mono text-2xl font-semibold", accountPercent == null ? "text-muted-foreground" : accountPercent >= 0 ? "text-emerald-500" : "text-red-500")}>
              {accountPercent == null ? "—" : formatPercent(accountPercent)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/55">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t("overviewWinRate")}</p>
            <p className="mt-1 font-mono text-2xl font-semibold text-foreground">{winRate}%</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/55">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t("overviewLivePositions")}</p>
            <p className="mt-1 font-mono text-2xl font-semibold text-foreground">
              {livePositions.length}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-border/60 bg-card/55">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="size-4 text-chart-3" />
              {t("profilePerformanceChart")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {points.length === 0 ? (
              <p className="rounded-md border border-dashed border-border/70 px-3 py-6 text-sm text-muted-foreground">
                {t("profilePerformanceEmpty")}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <svg
                  viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
                  role="img"
                  aria-label={t("profilePerformanceChart")}
                  className="h-56 min-w-150 w-full"
                >
                  <line
                    x1={CHART_LEFT}
                    x2={SVG_WIDTH - CHART_RIGHT}
                    y1={chart.zeroY}
                    y2={chart.zeroY}
                    className="stroke-border"
                    strokeWidth="1"
                  />
                  <line
                    x1={CHART_LEFT}
                    x2={SVG_WIDTH - CHART_RIGHT}
                    y1={CHART_TOP}
                    y2={CHART_TOP}
                    className="stroke-border/60"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <line
                    x1={CHART_LEFT}
                    x2={SVG_WIDTH - CHART_RIGHT}
                    y1={SVG_HEIGHT - CHART_BOTTOM}
                    y2={SVG_HEIGHT - CHART_BOTTOM}
                    className="stroke-border/60"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <text x="0" y={CHART_TOP + 4} className="fill-muted-foreground text-[11px]">
                    {formatCurrency(chart.maxAbs)}
                  </text>
                  <text x="0" y={chart.zeroY + 4} className="fill-muted-foreground text-[11px]">
                    $0
                  </text>
                  <text x="0" y={SVG_HEIGHT - CHART_BOTTOM + 4} className="fill-muted-foreground text-[11px]">
                    {formatCurrency(-chart.maxAbs)}
                  </text>
                  <path
                    d={chart.path}
                    fill="none"
                    className={totalPnl >= 0 ? "stroke-emerald-500" : "stroke-red-500"}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="3"
                  />
                  {points.map((point, index) => {
                    const xStep = points.length > 1 ? CHART_WIDTH / (points.length - 1) : 0;
                    const x = CHART_LEFT + index * xStep;
                    const y = chart.zeroY - (point.pnl / chart.maxAbs) * (CHART_HEIGHT / 2);
                    const showLabel = index === 0 || index === points.length - 1 || index % Math.ceil(points.length / 5) === 0;
                    return (
                      <g key={`${point.index}-${point.pnl}`}>
                        <circle
                          cx={x}
                          cy={y}
                          r="3"
                          className={point.pnl >= 0 ? "fill-emerald-500" : "fill-red-500"}
                        >
                          <title>{`${point.label}: ${formatCurrency(point.pnl)}`}</title>
                        </circle>
                        {showLabel ? (
                          <text x={x} y={SVG_HEIGHT - 12} textAnchor="middle" className="fill-muted-foreground text-[10px]">
                            {point.label}
                          </text>
                        ) : null}
                      </g>
                    );
                  })}
                </svg>
              </div>
            )}
          </CardContent>
        </Card>

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
                        {position.profit == null ? "—" : formatCurrency(position.profit)}
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
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
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
                      {formatCurrency(symbol.pnl)}
                    </span>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/55">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="size-4 text-muted-foreground" />
              {t("profileTradeHistoryTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            {trades.length === 0 ? (
              <p className="px-4 pb-4 text-sm text-muted-foreground">{t("profileTradeHistoryEmpty")}</p>
            ) : (
              <table className="w-full min-w-150 text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-4 py-2.5">{t("profileSymbol")}</th>
                    <th className="px-4 py-2.5">{t("profileDirection")}</th>
                    <th className="px-4 py-2.5">{t("profileResult")}</th>
                    <th className="px-4 py-2.5">{t("profilePnl")}</th>
                    <th className="px-4 py-2.5">{t("profileOpened")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {trades.slice(0, 8).map((trade) => (
                    <tr key={trade.id}>
                      <td className="px-4 py-2.5 font-mono font-medium text-foreground">{trade.symbol}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{trade.direction}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant="outline" className={cn(resultClass(trade.result))}>
                          {resultLabel(trade.result, t)}
                        </Badge>
                      </td>
                      <td className={cn("px-4 py-2.5 font-mono text-xs font-medium", (trade.pnl ?? 0) >= 0 ? "text-emerald-500" : "text-red-500")}>
                        {trade.pnl == null ? "—" : formatCurrency(trade.pnl)}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {trade.openedAt.toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", {
                          month: "numeric",
                          day: "numeric",
                          year: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
