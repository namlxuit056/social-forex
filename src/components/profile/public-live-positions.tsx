import { RadioTower } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

type Translator = (key: string) => string;

export type LivePosition = {
  ticket: string;
  symbol: string;
  type: string;
  volume: number | null;
  priceOpen: number | null;
  priceCurrent: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
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

export function parseLivePositions(value: unknown): LivePosition[] {
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
        stopLoss: numberOrNull(row.stopLoss),
        takeProfit: numberOrNull(row.takeProfit),
        profit: numberOrNull(row.profit),
      },
    ];
  });
}

/**
 * Full-width "running positions" section shown at the top of the public profile
 * (above the two-column overview grid) so it's the first thing a visitor sees.
 */
export async function PublicLivePositions({
  profileUserId,
  locale,
  t,
}: {
  profileUserId: string;
  locale: string;
  t: Translator;
}) {
  const [mt5Connection, latestSnapshot] = await Promise.all([
    prisma.mt5Connection.findFirst({
      where: { userId: profileUserId, revokedAt: null },
      orderBy: { lastSeenAt: "desc" },
      select: {
        accountCurrency: true,
        balance: true,
        equity: true,
        lastSeenAt: true,
      },
    }),
    prisma.mt5Snapshot.findFirst({
      where: { connection: { userId: profileUserId, revokedAt: null } },
      orderBy: { receivedAt: "desc" },
      select: { positions: true },
    }),
  ]);

  if (!mt5Connection) return null;

  const livePositions = parseLivePositions(latestSnapshot?.positions);
  const totalProfit = livePositions.reduce((sum, position) => sum + (position.profit ?? 0), 0);

  return (
    <Card className="border-border/60 bg-card/55">
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <RadioTower className="size-4 text-emerald-500" />
            {t("profileLiveTitle")}
          </CardTitle>
          {mt5Connection.lastSeenAt ? (
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
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2 text-xs sm:max-w-md">
          <div className="rounded-md bg-muted/25 px-2 py-1.5">
            <p className="text-muted-foreground">{t("profileBalance")}</p>
            <p className="font-mono text-foreground">
              {mt5Connection.balance == null
                ? "—"
                : `${mt5Connection.balance.toFixed(2)} ${mt5Connection.accountCurrency ?? ""}`}
            </p>
          </div>
          <div className="rounded-md bg-muted/25 px-2 py-1.5">
            <p className="text-muted-foreground">{t("profileEquity")}</p>
            <p className="font-mono text-foreground">
              {mt5Connection.equity == null
                ? "—"
                : `${mt5Connection.equity.toFixed(2)} ${mt5Connection.accountCurrency ?? ""}`}
            </p>
          </div>
          <div className="rounded-md bg-muted/25 px-2 py-1.5">
            <p className="text-muted-foreground">{t("profileFloatingPnl")}</p>
            <p
              className={cn(
                "font-mono font-semibold",
                livePositions.length === 0
                  ? "text-foreground"
                  : totalProfit >= 0
                    ? "text-emerald-500"
                    : "text-red-500",
              )}
            >
              {livePositions.length === 0 ? "—" : fmtCurrency(totalProfit)}
            </p>
          </div>
        </div>
        {livePositions.length === 0 ? (
          <p className="rounded-md border border-dashed border-border/70 px-3 py-4 text-sm text-muted-foreground">
            {t("profileNoLivePositions")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-160 text-xs">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="px-2 pb-2 text-left font-medium">{t("profileSymbol")}</th>
                  <th className="px-2 pb-2 text-left font-medium">{t("profileDirection")}</th>
                  <th className="px-2 pb-2 text-right font-medium">{t("profileLot")}</th>
                  <th className="px-2 pb-2 text-right font-medium">{t("profileEntry")}</th>
                  <th className="px-2 pb-2 text-right font-medium">{t("profileCurrent")}</th>
                  <th className="px-2 pb-2 text-right font-medium">{t("mt5Sl")}</th>
                  <th className="px-2 pb-2 text-right font-medium">{t("mt5Tp")}</th>
                  <th className="px-2 pb-2 text-right font-medium">{t("profilePnl")}</th>
                </tr>
              </thead>
              <tbody>
                {livePositions.slice(0, 5).map((position) => {
                  const isProfit = (position.profit ?? 0) >= 0;
                  return (
                    <tr
                      key={position.ticket}
                      className={cn("border-t border-border/60", isProfit ? "bg-emerald-500/5" : "bg-red-500/5")}
                    >
                      <td className="px-2 py-2 font-mono font-semibold text-foreground">{position.symbol}</td>
                      <td className="px-2 py-2 font-mono text-muted-foreground">{position.type}</td>
                      <td className="px-2 py-2 text-right font-mono text-muted-foreground">{position.volume ?? "—"}</td>
                      <td className="px-2 py-2 text-right font-mono text-muted-foreground">{position.priceOpen ?? "—"}</td>
                      <td className="px-2 py-2 text-right font-mono text-muted-foreground">{position.priceCurrent ?? "—"}</td>
                      <td className="px-2 py-2 text-right font-mono text-muted-foreground">{position.stopLoss ?? "—"}</td>
                      <td className="px-2 py-2 text-right font-mono text-muted-foreground">{position.takeProfit ?? "—"}</td>
                      <td
                        className={cn(
                          "px-2 py-2 text-right font-mono font-semibold",
                          isProfit ? "text-emerald-500" : "text-red-500",
                        )}
                      >
                        {position.profit == null ? "—" : fmtCurrency(position.profit)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-border/60">
                  <td colSpan={7} className="px-2 py-2 text-right font-medium text-muted-foreground">
                    {t("profileFloatingPnl")}
                  </td>
                  <td
                    className={cn(
                      "px-2 py-2 text-right font-mono font-semibold",
                      totalProfit >= 0 ? "text-emerald-500" : "text-red-500",
                    )}
                  >
                    {fmtCurrency(totalProfit)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
