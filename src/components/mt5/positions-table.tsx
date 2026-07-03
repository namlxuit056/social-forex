"use client";

import { useState, useTransition } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { Activity, ArrowDownRight, ArrowUpRight, Lock, SlidersHorizontal, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { closePosition, modifyPosition } from "@/actions/mt5-commands";
import { getPipSize } from "@/lib/mt5/pip-size";
import { ModifyDialog } from "./modify-dialog";
import type { LivePosition } from "@/app/[locale]/journal/journal-live-panel";

function fmt(v: number | null, d = 5) {
  return v == null ? "—" : v.toFixed(d);
}

function fmtProfit(v: number | null) {
  if (v == null) return "—";
  const sign = v >= 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}`;
}

function SideBadge({ type }: { type: string }) {
  const isBuy = type.toUpperCase().startsWith("BUY");
  return (
    <Badge
      variant={isBuy ? "default" : "destructive"}
      className={cn("min-w-16 justify-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", !isBuy && "bg-destructive text-white")}
    >
      {isBuy ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
      {type}
    </Badge>
  );
}

function PL({ value, className }: { value: number | null; className?: string }) {
  const v = value ?? 0;
  return (
    <span className={cn("font-mono font-semibold tabular-nums", v >= 0 ? "text-emerald-500" : "text-red-500", className)}>
      {fmtProfit(value)}
    </span>
  );
}

function estimateRisk(p: LivePosition, equity: number | null) {
  if (p.priceOpen == null || p.priceCurrent == null || p.stopLoss == null || p.profit == null || equity == null || equity <= 0) {
    return null;
  }
  const isBuy = p.type.toUpperCase().startsWith("BUY");
  const dir = isBuy ? 1 : -1;
  const priceDiff = (p.priceCurrent - p.priceOpen) * dir;
  const pipSize = getPipSize(p.symbol);
  if (Math.abs(priceDiff) < pipSize * 0.5) return null;
  const valuePerUnit = p.profit / priceDiff;
  const slDistancePrice = Math.abs(p.priceOpen - p.stopLoss);
  const riskAmount = Math.abs(valuePerUnit) * slDistancePrice;
  const riskPct = (riskAmount / equity) * 100;
  const slDistancePips = slDistancePrice / pipSize;
  return { riskAmount, riskPct, slDistancePips };
}

function RiskCell({ p, equity, currency }: { p: LivePosition; equity: number | null; currency: string | null }) {
  const risk = estimateRisk(p, equity);
  if (!risk) {
    return <span className="font-mono text-xs tabular-nums text-muted-foreground">—</span>;
  }
  const tone = risk.riskPct > 5 ? "text-red-500" : risk.riskPct > 2 ? "text-amber-500" : "text-muted-foreground";
  return (
    <span className={cn("font-mono text-xs font-semibold tabular-nums", tone)}>
      -{risk.riskAmount.toFixed(2)} {currency ?? ""} ({risk.riskPct.toFixed(1)}%)
    </span>
  );
}

function openedAgo(openedAt: string | null) {
  if (!openedAt) return "—";
  const d = new Date(openedAt);
  if (!Number.isFinite(d.getTime())) return "—";
  return `${formatDistanceToNowStrict(d)} ago`;
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
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
      <p className="text-sm font-medium text-foreground">No open positions</p>
      <p className="text-xs text-muted-foreground">New trades from your EA will appear here automatically.</p>
    </div>
  );
}

type Props = {
  positions: LivePosition[];
  currency: string | null;
  equity: number | null;
};

function isAtBreakeven(p: LivePosition) {
  return p.priceOpen != null && p.stopLoss != null && Math.abs(p.stopLoss - p.priceOpen) < 1e-8;
}

export function PositionsTable({ positions, currency, equity }: Props) {
  const [modifyTarget, setModifyTarget] = useState<LivePosition | null>(null);
  const [closing, setClosing] = useState<Set<string>>(new Set());
  const [movingBE, setMovingBE] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  function handleClose(ticket: string) {
    setClosing((prev) => new Set(prev).add(ticket));
    startTransition(async () => {
      await closePosition(ticket);
    });
  }

  function handleBreakeven(p: LivePosition) {
    if (p.priceOpen == null) return;
    setMovingBE((prev) => new Set(prev).add(p.ticket));
    startTransition(async () => {
      await modifyPosition(p.ticket, p.priceOpen, p.takeProfit);
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between px-4 py-4 sm:px-6">
        <h2 className="text-base font-semibold">Open Positions</h2>
        <span className="text-xs text-muted-foreground">{positions.length} active</span>
      </div>

      {positions.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Desktop / tablet table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-235 border-collapse text-sm">
              <thead>
                <tr className="border-t border-border text-xs text-muted-foreground">
                  <th className="px-6 py-3 text-left font-medium">Ticket</th>
                  <th className="px-3 py-3 text-left font-medium">Symbol</th>
                  <th className="px-3 py-3 text-left font-medium">Type</th>
                  <th className="px-3 py-3 text-right font-medium">Lot</th>
                  <th className="px-3 py-3 text-right font-medium">Entry</th>
                  <th className="px-3 py-3 text-right font-medium">Current</th>
                  <th className="px-3 py-3 text-right font-medium">SL</th>
                  <th className="px-3 py-3 text-right font-medium">TP</th>
                  <th className="px-3 py-3 text-right font-medium">P/L {currency ?? ""}</th>
                  <th className="px-3 py-3 text-right font-medium">Risk</th>
                  <th className="px-3 py-3 text-right font-medium">Opened</th>
                  <th className="px-6 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p) => {
                  const isClosing = closing.has(p.ticket);
                  const isMovingBE = movingBE.has(p.ticket);
                  const atBreakeven = isAtBreakeven(p);
                  return (
                    <tr key={p.ticket} className={cn("border-t border-border transition-colors hover:bg-muted/40", isClosing && "opacity-40")}>
                      <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{p.ticket}</td>
                      <td className="px-3 py-4 font-semibold">{p.symbol}</td>
                      <td className="px-3 py-4">
                        <SideBadge type={p.type} />
                      </td>
                      <td className="px-3 py-4 text-right font-mono tabular-nums">{fmt(p.volume, 2)}</td>
                      <td className="px-3 py-4 text-right font-mono tabular-nums">{fmt(p.priceOpen)}</td>
                      <td className="px-3 py-4 text-right font-mono tabular-nums">{fmt(p.priceCurrent)}</td>
                      <td className="px-3 py-4 text-right font-mono tabular-nums text-muted-foreground">{fmt(p.stopLoss)}</td>
                      <td className="px-3 py-4 text-right font-mono tabular-nums text-muted-foreground">{fmt(p.takeProfit)}</td>
                      <td className="px-3 py-4 text-right">
                        <PL value={p.profit} />
                      </td>
                      <td className="px-3 py-4 text-right">
                        <RiskCell p={p} equity={equity} currency={currency} />
                      </td>
                      <td className="px-3 py-4 text-right font-mono text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                        {openedAgo(p.openedAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleBreakeven(p)}
                            disabled={isClosing || isMovingBE || atBreakeven || p.priceOpen == null}
                            className="gap-1.5"
                            title="Move stop loss to entry price"
                          >
                            <Lock className="size-3.5" />
                            {isMovingBE ? "Queued" : atBreakeven ? "At BE" : "BE"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setModifyTarget(p)}
                            disabled={isClosing}
                            className="gap-1.5"
                          >
                            <SlidersHorizontal className="size-3.5" />
                            Modify
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleClose(p.ticket)}
                            disabled={isClosing}
                            className="gap-1.5"
                          >
                            <X className="size-3.5" />
                            {isClosing ? "Queued" : "Close"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="flex flex-col gap-3 p-3 md:hidden">
            {positions.map((p) => {
              const isClosing = closing.has(p.ticket);
              const isMovingBE = movingBE.has(p.ticket);
              const atBreakeven = isAtBreakeven(p);
              const risk = estimateRisk(p, equity);
              return (
                <div key={p.ticket} className={cn("rounded-xl border border-border bg-background p-4 transition-opacity", isClosing && "opacity-40")}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-semibold">{p.symbol}</span>
                      <SideBadge type={p.type} />
                    </div>
                    <div className="text-right">
                      <PL value={p.profit} className="text-base" />
                      <p className="text-[11px] text-muted-foreground">P/L {currency ?? ""}</p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <Row label="Lot" value={fmt(p.volume, 2)} />
                    <Row label="Ticket" value={p.ticket} muted />
                    <Row label="Entry" value={fmt(p.priceOpen)} />
                    <Row label="Current" value={fmt(p.priceCurrent)} />
                    <Row label="SL" value={fmt(p.stopLoss)} muted />
                    <Row label="TP" value={fmt(p.takeProfit)} muted />
                    <Row label="Opened" value={openedAgo(p.openedAt)} muted />
                    <Row label="Risk" value={risk ? `-${risk.riskAmount.toFixed(2)} (${risk.riskPct.toFixed(1)}%)` : "—"} muted />
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleBreakeven(p)}
                      disabled={isClosing || isMovingBE || atBreakeven || p.priceOpen == null}
                      className="flex-1 gap-1.5"
                    >
                      <Lock className="size-3.5" />
                      {isMovingBE ? "Queued" : atBreakeven ? "At BE" : "BE"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setModifyTarget(p)}
                      disabled={isClosing}
                      className="flex-1 gap-1.5"
                    >
                      <SlidersHorizontal className="size-3.5" />
                      Modify
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleClose(p.ticket)}
                      disabled={isClosing}
                      className="flex-1 gap-1.5"
                    >
                      <X className="size-3.5" />
                      {isClosing ? "Queued" : "Close"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {modifyTarget && (
        <ModifyDialog
          open
          onOpenChange={(v) => { if (!v) setModifyTarget(null); }}
          ticket={modifyTarget.ticket}
          symbol={modifyTarget.symbol}
          currentSl={modifyTarget.stopLoss}
          currentTp={modifyTarget.takeProfit}
        />
      )}
    </div>
  );
}
