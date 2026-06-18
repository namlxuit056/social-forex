"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Trade = {
  id: string;
  symbol: string;
  direction: string;
  result: string;
  pnl: number | null;
  openedAt: string;
};

type Translator = (key: string) => string;

const PAGE_SIZE = 10;

function fmtCurrency(v: number) {
  const sign = v >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(v).toFixed(2)}`;
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

export function TradeHistoryPaginated({
  trades,
  locale,
  t,
}: {
  trades: Trade[];
  locale: string;
  t: Translator;
}) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(trades.length / PAGE_SIZE);
  const pageTrades = trades.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const dateLocale = locale === "vi" ? "vi-VN" : "en-US";

  return (
    <>
      <div className="space-y-2 px-4 pb-4 sm:hidden">
        {pageTrades.map((trade) => (
          <div key={trade.id} className="rounded-lg border border-border/60 bg-muted/15 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-sm font-semibold text-foreground">{trade.symbol}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {trade.direction} ·{" "}
                  {new Date(trade.openedAt).toLocaleDateString(dateLocale, {
                    month: "numeric",
                    day: "numeric",
                    year: "2-digit",
                  })}
                </p>
              </div>
              <div className="text-right">
                <Badge variant="outline" className={cn(resultClass(trade.result))}>
                  {resultLabel(trade.result, t)}
                </Badge>
                <p
                  className={cn(
                    "mt-2 font-mono text-xs font-medium",
                    (trade.pnl ?? 0) >= 0 ? "text-emerald-500" : "text-red-500",
                  )}
                >
                  {trade.pnl == null ? "—" : fmtCurrency(trade.pnl)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto sm:block">
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
            {pageTrades.map((trade) => (
              <tr key={trade.id}>
                <td className="px-4 py-2.5 font-mono font-medium text-foreground">{trade.symbol}</td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">{trade.direction}</td>
                <td className="px-4 py-2.5">
                  <Badge variant="outline" className={cn(resultClass(trade.result))}>
                    {resultLabel(trade.result, t)}
                  </Badge>
                </td>
                <td
                  className={cn(
                    "px-4 py-2.5 font-mono text-xs font-medium",
                    (trade.pnl ?? 0) >= 0 ? "text-emerald-500" : "text-red-500",
                  )}
                >
                  {trade.pnl == null ? "—" : fmtCurrency(trade.pnl)}
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">
                  {new Date(trade.openedAt).toLocaleDateString(dateLocale, {
                    month: "numeric",
                    day: "numeric",
                    year: "2-digit",
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border/40 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, trades.length)} / {trades.length}
          </p>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-7"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-7"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
