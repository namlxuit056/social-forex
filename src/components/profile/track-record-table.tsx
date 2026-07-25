"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type TrackRecordRow = {
  id: string;
  symbol: string;
  direction: string;
  entry: number;
  stopLoss: number | null;
  takeProfit: number | null;
  status: "CLOSED_WIN" | "CLOSED_LOSS";
  r: number;
  openedAt: string;
  closedAt: string;
};

type ResultFilter = "ALL" | "CLOSED_WIN" | "CLOSED_LOSS";

const PAGE_SIZE = 10;

function fmtPrice(v: number | null) {
  return v == null ? "—" : v.toString();
}

function fmtR(v: number) {
  const sign = v >= 0 ? "+" : "-";
  return `${sign}${Math.abs(v).toFixed(2)}R`;
}

export function TrackRecordTable({
  rows,
  symbols,
  locale,
}: {
  rows: TrackRecordRow[];
  symbols: string[];
  locale: string;
}) {
  const t = useTranslations("profile");
  const [symbol, setSymbol] = useState<string>("ALL");
  const [result, setResult] = useState<ResultFilter>("ALL");
  const [page, setPage] = useState(0);
  const dateLocale = locale === "vi" ? "vi-VN" : "en-US";

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (symbol !== "ALL" && r.symbol !== symbol) return false;
      if (result !== "ALL" && r.status !== result) return false;
      return true;
    });
  }, [rows, symbol, result]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function fmtDate(v: string) {
    return new Date(v).toLocaleDateString(dateLocale, {
      month: "numeric",
      day: "numeric",
      year: "2-digit",
    });
  }

  return (
    <div className="rounded-lg border border-border/60 bg-card/50">
      <div className="flex flex-wrap items-center gap-2 border-b border-border/40 p-3">
        <select
          value={symbol}
          onChange={(e) => {
            setSymbol(e.target.value);
            setPage(0);
          }}
          className="h-9 rounded-md border border-border bg-background px-2.5 text-sm"
        >
          <option value="ALL">{t("trackRecord.filterAllSymbols")}</option>
          {symbols.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={result}
          onChange={(e) => {
            setResult(e.target.value as ResultFilter);
            setPage(0);
          }}
          className="h-9 rounded-md border border-border bg-background px-2.5 text-sm"
        >
          <option value="ALL">{t("trackRecord.filterAllResults")}</option>
          <option value="CLOSED_WIN">{t("trackRecord.resultWin")}</option>
          <option value="CLOSED_LOSS">{t("trackRecord.resultLoss")}</option>
        </select>
        <span className="ml-auto text-xs text-muted-foreground">
          {t("trackRecord.count", { count: filtered.length })}
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="p-6 text-center text-sm text-muted-foreground">{t("trackRecord.noMatch")}</p>
      ) : (
        <>
          <div className="space-y-2 p-3 sm:hidden">
            {pageRows.map((row) => (
              <div key={row.id} className="rounded-lg border border-border/60 bg-muted/15 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm font-semibold text-foreground">{row.symbol}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {row.direction} · {fmtDate(row.closedAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant="outline"
                      className={cn(
                        row.status === "CLOSED_WIN"
                          ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                          : "border-red-500/40 bg-red-500/15 text-red-700 dark:text-red-300",
                      )}
                    >
                      {row.status === "CLOSED_WIN" ? t("trackRecord.resultWin") : t("trackRecord.resultLoss")}
                    </Badge>
                    <p
                      className={cn(
                        "mt-2 font-mono text-xs font-medium",
                        row.r >= 0 ? "text-emerald-500" : "text-red-500",
                      )}
                    >
                      {fmtR(row.r)}
                    </p>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                  <span>{t("trackRecord.colEntry")}: {fmtPrice(row.entry)}</span>
                  <span>{t("trackRecord.colSl")}: {fmtPrice(row.stopLoss)}</span>
                  <span>{t("trackRecord.colTp")}: {fmtPrice(row.takeProfit)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-175 text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2.5">{t("trackRecord.colSymbol")}</th>
                  <th className="px-4 py-2.5">{t("trackRecord.colDirection")}</th>
                  <th className="px-4 py-2.5">{t("trackRecord.colEntry")}</th>
                  <th className="px-4 py-2.5">{t("trackRecord.colSl")}</th>
                  <th className="px-4 py-2.5">{t("trackRecord.colTp")}</th>
                  <th className="px-4 py-2.5">{t("trackRecord.colResult")}</th>
                  <th className="px-4 py-2.5">{t("trackRecord.colR")}</th>
                  <th className="px-4 py-2.5">{t("trackRecord.colOpened")}</th>
                  <th className="px-4 py-2.5">{t("trackRecord.colClosed")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {pageRows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-2.5 font-mono font-medium text-foreground">{row.symbol}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{row.direction}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{fmtPrice(row.entry)}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{fmtPrice(row.stopLoss)}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{fmtPrice(row.takeProfit)}</td>
                    <td className="px-4 py-2.5">
                      <Badge
                        variant="outline"
                        className={cn(
                          row.status === "CLOSED_WIN"
                            ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                            : "border-red-500/40 bg-red-500/15 text-red-700 dark:text-red-300",
                        )}
                      >
                        {row.status === "CLOSED_WIN" ? t("trackRecord.resultWin") : t("trackRecord.resultLoss")}
                      </Badge>
                    </td>
                    <td
                      className={cn(
                        "px-4 py-2.5 font-mono text-xs font-medium",
                        row.r >= 0 ? "text-emerald-500" : "text-red-500",
                      )}
                    >
                      {fmtR(row.r)}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{fmtDate(row.openedAt)}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{fmtDate(row.closedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border/40 px-4 py-3">
              <p className="text-xs text-muted-foreground">
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} / {filtered.length}
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
      )}
    </div>
  );
}
