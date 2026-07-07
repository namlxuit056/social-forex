"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Activity, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type ClosedTrade = {
  id: string;
  symbol: string;
  direction: string; // "LONG" | "SHORT"
  entry: number;
  stopLoss: number | null;
  takeProfit: number | null;
  exitPrice: number | null;
  lotSize: number | null;
  result: "WIN" | "LOSS" | "BREAKEVEN" | "PENDING";
  pnl: number | null;
  openedAt: string;
  closedAt: string;
};

function fmt(v: number | null, d = 5) {
  return v == null ? "—" : v.toFixed(d);
}

function fmtProfit(v: number | null) {
  if (v == null) return "—";
  const sign = v >= 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}`;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? format(d, "dd/MM HH:mm") : "—";
}

// TP distance as a % of entry price — how far price had to move to reach the target,
// independent of the actual close price (MT5 bridge doesn't report the exact fill price).
function computeTpPercent(entry: number, takeProfit: number | null): number | null {
  if (takeProfit == null || takeProfit === 0 || entry <= 0) return null;
  return (Math.abs(takeProfit - entry) / entry) * 100;
}

// Planned reward:risk ratio from entry/SL/TP price distances. The $ value-per-unit cancels
// out of the ratio, so this only needs the three prices — no equity/currency conversion.
function computeRR(entry: number, stopLoss: number | null, takeProfit: number | null): number | null {
  if (stopLoss == null || stopLoss === 0 || takeProfit == null || takeProfit === 0) return null;
  const slDistance = Math.abs(entry - stopLoss);
  if (slDistance <= 0) return null;
  const tpDistance = Math.abs(takeProfit - entry);
  return tpDistance / slDistance;
}

function LevelValue({ value }: { value: number | null }) {
  if (value == null || value === 0) {
    return <span className="italic text-muted-foreground/70">Not set</span>;
  }
  return <>{fmt(value)}</>;
}

function DirectionBadge({ direction }: { direction: string }) {
  const isLong = direction.toUpperCase() === "LONG";
  return (
    <Badge
      variant={isLong ? "default" : "destructive"}
      className={cn("min-w-16 justify-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", !isLong && "bg-destructive text-white")}
    >
      {isLong ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
      {isLong ? "BUY" : "SELL"}
    </Badge>
  );
}

function ResultBadge({ result }: { result: ClosedTrade["result"] }) {
  const tone =
    result === "WIN"
      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
      : result === "LOSS"
        ? "bg-red-500/15 text-red-600 dark:text-red-400"
        : "bg-muted text-muted-foreground";
  return <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", tone)}>{result}</span>;
}

function PL({ value }: { value: number | null }) {
  const v = value ?? 0;
  return (
    <span className={cn("font-mono font-semibold tabular-nums", v >= 0 ? "text-emerald-500" : "text-red-500")}>
      {fmtProfit(value)}
    </span>
  );
}

function RrCell({ trade }: { trade: ClosedTrade }) {
  const tpPercent = computeTpPercent(trade.entry, trade.takeProfit);
  const rr = computeRR(trade.entry, trade.stopLoss, trade.takeProfit);
  if (tpPercent == null && rr == null) {
    return <span className="font-mono text-xs tabular-nums text-muted-foreground">—</span>;
  }
  return (
    <span className="inline-flex flex-col items-end">
      {tpPercent != null && (
        <span className="font-mono text-xs tabular-nums text-emerald-600 dark:text-emerald-400">
          TP {tpPercent.toFixed(2)}%
        </span>
      )}
      {rr != null && (
        <span
          className={cn(
            "font-mono text-[11px] font-semibold tabular-nums",
            rr >= 2 ? "text-emerald-600 dark:text-emerald-400" : rr >= 1 ? "text-amber-600 dark:text-amber-400" : "text-destructive",
          )}
        >
          R:R 1:{rr.toFixed(2)}
        </span>
      )}
    </span>
  );
}

function Row({ label, value, muted }: { label: string; value: React.ReactNode; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("font-mono text-xs tabular-nums", muted ? "text-muted-foreground" : "text-foreground")}>{value}</span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-muted">
        <Activity className="size-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground">No closed trades yet</p>
      <p className="text-xs text-muted-foreground">Trades your EA closes will show up here.</p>
    </div>
  );
}

function FilterEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-muted">
        <Activity className="size-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground">No trades match the filter</p>
    </div>
  );
}

type Props = {
  trades: ClosedTrade[];
  currency: string | null;
};

export function HistoryTable({ trades, currency }: Props) {
  const [symbolFilter, setSymbolFilter] = useState("all");
  const [resultFilter, setResultFilter] = useState<"all" | "WIN" | "LOSS" | "BREAKEVEN">("all");

  const symbols = useMemo(() => Array.from(new Set(trades.map((t) => t.symbol))).sort(), [trades]);

  const filteredTrades = useMemo(() => {
    return trades.filter((t) => {
      if (symbolFilter !== "all" && t.symbol !== symbolFilter) return false;
      if (resultFilter !== "all" && t.result !== resultFilter) return false;
      return true;
    });
  }, [trades, symbolFilter, resultFilter]);

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold">Order History</h2>
          <span className="text-xs text-muted-foreground">{trades.length} closed</span>
        </div>
        {trades.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <Select value={symbolFilter} onValueChange={(v) => v && setSymbolFilter(v)}>
              <SelectTrigger size="sm">
                <SelectValue placeholder="All symbols">
                  {(v: string) => (v === "all" ? "All symbols" : v)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All symbols</SelectItem>
                {symbols.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={resultFilter} onValueChange={(v) => v && setResultFilter(v as typeof resultFilter)}>
              <SelectTrigger size="sm">
                <SelectValue placeholder="All results">
                  {(v: string) => (v === "all" ? "All results" : v)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All results</SelectItem>
                <SelectItem value="WIN">Win</SelectItem>
                <SelectItem value="LOSS">Loss</SelectItem>
                <SelectItem value="BREAKEVEN">Breakeven</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {trades.length === 0 ? (
        <EmptyState />
      ) : filteredTrades.length === 0 ? (
        <FilterEmptyState />
      ) : (
        <>
          {/* Desktop / tablet table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-t border-border text-xs text-muted-foreground">
                  <th className="px-3 py-3 text-left font-medium">Symbol</th>
                  <th className="px-2 py-3 text-left font-medium">Type</th>
                  <th className="px-2 py-3 text-right font-medium">Lot</th>
                  <th className="px-2 py-3 text-right font-medium">Entry / Exit</th>
                  <th className="px-2 py-3 text-right font-medium">SL / TP</th>
                  <th className="px-2 py-3 text-right font-medium">TP% / RR</th>
                  <th className="px-2 py-3 text-right font-medium">{`P/L ${currency ?? ""}`}</th>
                  <th className="px-2 py-3 text-right font-medium">Result</th>
                  <th className="px-2 py-3 text-right font-medium">Closed</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrades.map((t) => (
                  <tr key={t.id} className="border-t border-border transition-colors hover:bg-muted/40">
                    <td className="px-3 py-3 font-semibold whitespace-nowrap">{t.symbol}</td>
                    <td className="px-2 py-3">
                      <DirectionBadge direction={t.direction} />
                    </td>
                    <td className="px-2 py-3 text-right font-mono tabular-nums">{fmt(t.lotSize, 2)}</td>
                    <td className="px-2 py-3 text-right font-mono text-xs tabular-nums whitespace-nowrap">
                      <span className="block text-muted-foreground">{fmt(t.entry)}</span>
                      <span className="block font-semibold">{fmt(t.exitPrice)}</span>
                    </td>
                    <td className="px-2 py-3 text-right font-mono text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                      <div>
                        <LevelValue value={t.stopLoss} />
                      </div>
                      <div className="mt-1">
                        <LevelValue value={t.takeProfit} />
                      </div>
                    </td>
                    <td className="px-2 py-3 text-right whitespace-nowrap">
                      <RrCell trade={t} />
                    </td>
                    <td className="px-2 py-3 text-right whitespace-nowrap">
                      <PL value={t.pnl} />
                    </td>
                    <td className="px-2 py-3 text-right whitespace-nowrap">
                      <ResultBadge result={t.result} />
                    </td>
                    <td className="px-2 py-3 text-right font-mono text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                      {fmtDate(t.closedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="flex flex-col gap-3 p-3 md:hidden">
            {filteredTrades.map((t) => (
              <div key={t.id} className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold">{t.symbol}</span>
                    <DirectionBadge direction={t.direction} />
                  </div>
                  <div className="text-right">
                    <PL value={t.pnl} />
                    <p className="text-[11px] text-muted-foreground">P/L {currency ?? ""}</p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <Row label="Lot" value={fmt(t.lotSize, 2)} />
                  <Row label="Result" value={<ResultBadge result={t.result} />} />
                  <Row label="Entry" value={fmt(t.entry)} />
                  <Row label="Exit" value={fmt(t.exitPrice)} />
                  <Row label="SL" value={<LevelValue value={t.stopLoss} />} muted />
                  <Row label="TP" value={<LevelValue value={t.takeProfit} />} muted />
                  <Row label="TP% / RR" value={<RrCell trade={t} />} muted />
                  <Row label="Closed" value={fmtDate(t.closedAt)} muted />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
