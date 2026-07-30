"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LivePosition } from "./public-live-positions";

function directionBadgeClass(type: string): string {
  const upper = type.toUpperCase();
  if (upper.startsWith("BUY")) return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  if (upper.startsWith("SELL")) return "bg-red-500/10 text-red-600 dark:text-red-400";
  return "bg-muted/40 text-muted-foreground";
}

function fmt(v: number | null): string {
  return v == null ? "—" : String(v);
}

function CountBadge({ value }: { value: number }) {
  return (
    <span className="flex min-w-4 items-center justify-center rounded-full bg-background px-1 text-[10px] font-semibold text-foreground">
      {value}
    </span>
  );
}

function StatusTable({
  rows,
  showLiveColumns,
  emptyLabel,
  t,
}: {
  rows: LivePosition[];
  showLiveColumns: boolean;
  emptyLabel: string;
  t: (key: string) => string;
}) {
  if (rows.length === 0) {
    return <p className="py-2 text-xs text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-130 text-xs">
        <thead>
          <tr className="text-muted-foreground">
            <th className="px-2 pb-1.5 text-left font-medium">{t("profileSymbol")}</th>
            <th className="px-2 pb-1.5 text-left font-medium">{t("profileDirection")}</th>
            <th className="px-2 pb-1.5 text-right font-medium">{t("profileLot")}</th>
            <th className="px-2 pb-1.5 text-right font-medium">{t("profileEntry")}</th>
            {showLiveColumns ? (
              <th className="px-2 pb-1.5 text-right font-medium">{t("profileCurrent")}</th>
            ) : null}
            <th className="px-2 pb-1.5 text-right font-medium">{t("mt5Sl")}</th>
            <th className="px-2 pb-1.5 text-right font-medium">{t("mt5Tp")}</th>
            {showLiveColumns ? (
              <th className="px-2 pb-1.5 text-right font-medium">{t("profilePnl")}</th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isProfit = (row.profit ?? 0) >= 0;
            return (
              <tr
                key={row.ticket}
                className={cn(
                  "border-t border-border/60",
                  showLiveColumns && (isProfit ? "bg-emerald-500/5" : "bg-red-500/5"),
                )}
              >
                <td className="px-2 py-1.5 font-mono font-semibold text-foreground">{row.symbol}</td>
                <td className="px-2 py-1.5">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 font-mono text-[11px]",
                      directionBadgeClass(row.type),
                    )}
                  >
                    {row.type}
                  </span>
                </td>
                <td className="px-2 py-1.5 text-right font-mono text-muted-foreground">{fmt(row.volume)}</td>
                <td className="px-2 py-1.5 text-right font-mono text-muted-foreground">{fmt(row.priceOpen)}</td>
                {showLiveColumns ? (
                  <td className="px-2 py-1.5 text-right font-mono text-muted-foreground">
                    {fmt(row.priceCurrent)}
                  </td>
                ) : null}
                <td className="px-2 py-1.5 text-right font-mono text-muted-foreground">{fmt(row.stopLoss)}</td>
                <td className="px-2 py-1.5 text-right font-mono text-muted-foreground">{fmt(row.takeProfit)}</td>
                {showLiveColumns ? (
                  <td
                    className={cn(
                      "px-2 py-1.5 text-right font-mono font-semibold",
                      isProfit ? "text-emerald-500" : "text-red-500",
                    )}
                  >
                    {row.profit == null ? "—" : `${row.profit >= 0 ? "+" : ""}${row.profit.toFixed(2)}`}
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function CopierPositionsPanel({
  positions,
  pendingOrders,
}: {
  positions: LivePosition[];
  pendingOrders: LivePosition[];
}) {
  const t = useTranslations("profile");

  if (positions.length === 0 && pendingOrders.length === 0) {
    return <p className="text-xs text-muted-foreground">{t("profileNoLivePositions")}</p>;
  }

  const defaultTab = positions.length > 0 ? "open" : "pending";

  return (
    <Tabs defaultValue={defaultTab} className="gap-2">
      <TabsList className="h-auto w-max rounded-full bg-muted p-0.5">
        <TabsTrigger value="open" className="gap-1.5 rounded-full px-3 py-1 text-xs">
          {t("profileLiveTitle")}
          <CountBadge value={positions.length} />
        </TabsTrigger>
        <TabsTrigger value="pending" className="gap-1.5 rounded-full px-3 py-1 text-xs">
          {t("mt5KindPending")}
          <CountBadge value={pendingOrders.length} />
        </TabsTrigger>
      </TabsList>
      <TabsContent value="open">
        <StatusTable rows={positions} showLiveColumns t={t} emptyLabel={t("profileNoLivePositions")} />
      </TabsContent>
      <TabsContent value="pending">
        <StatusTable
          rows={pendingOrders}
          showLiveColumns={false}
          t={t}
          emptyLabel={t("profileNoPendingOrders")}
        />
      </TabsContent>
    </Tabs>
  );
}
