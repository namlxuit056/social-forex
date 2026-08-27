"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Ban, Clock, Percent, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { cancelOrder, modifyOrder } from "@/actions/mt5-commands";
import {
  estimateOrderRisk,
  estimateStopLossForRisk,
  estimateTakeProfitForReward,
  roundToSymbolPrecision,
} from "@/lib/calculators";
import type { QuotesApiResponse } from "@/lib/quotes/types";
import { ModifyDialog } from "./modify-dialog";
import type { LivePendingOrder } from "@/app/api/mt5/account/route";

function fmt(v: number | null, d = 5) {
  return v == null ? "—" : v.toFixed(d);
}

function LevelValue({ value }: { value: number | null }) {
  if (value == null || value === 0) {
    return <span className="italic text-muted-foreground/70">Not set</span>;
  }
  return <>{fmt(value)}</>;
}

// A pending order "lights up" once the market price is within this % of its trigger
// price — % rather than fixed pips so it scales across XAUUSD, BTCUSD, EURJPY, etc.
const NEAR_TRIGGER_PCT = 0.15;

type QuoteMap = Record<string, { bid: number; ask: number }>;

function distanceToTriggerPct(o: LivePendingOrder, quotes: QuoteMap): number | null {
  if (o.priceOpen == null || o.priceOpen <= 0) return null;
  const quote = quotes[o.symbol];
  if (!quote) return null;
  const isBuy = o.type.toUpperCase().startsWith("BUY");
  const current = isBuy ? quote.ask : quote.bid;
  if (!Number.isFinite(current) || current <= 0) return null;
  return (Math.abs(current - o.priceOpen) / current) * 100;
}

function isNearTrigger(o: LivePendingOrder, quotes: QuoteMap): boolean {
  const distance = distanceToTriggerPct(o, quotes);
  return distance != null && distance <= NEAR_TRIGGER_PCT;
}

function NearTriggerBadge() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger render={<span className="relative inline-flex size-2.5" />}>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex size-2.5 rounded-full bg-amber-500" />
        </TooltipTrigger>
        <TooltipContent>Price is close to the trigger — order may fill soon</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// MT5 reports 0 (not null) for an unset SL/TP — treat it the same as "not set".
function orderRisk(o: LivePendingOrder) {
  return estimateOrderRisk({
    symbol: o.symbol,
    isBuy: o.type.toUpperCase().startsWith("BUY"),
    entryPrice: o.priceOpen,
    volume: o.volume,
    stopLoss: o.stopLoss,
    takeProfit: o.takeProfit,
  });
}

function SlAmount({ o }: { o: LivePendingOrder }) {
  const { slAmount } = orderRisk(o);
  if (slAmount == null || slAmount <= 0) return null;
  return <span className="block font-mono text-[11px] text-red-500">-{slAmount.toFixed(2)}</span>;
}

function TpAmount({ o }: { o: LivePendingOrder }) {
  const { tpAmount } = orderRisk(o);
  if (tpAmount == null || tpAmount <= 0) return null;
  return <span className="block font-mono text-[11px] text-emerald-500">+{tpAmount.toFixed(2)}</span>;
}

function RiskRewardCell({ o }: { o: LivePendingOrder }) {
  const { riskReward } = orderRisk(o);
  if (riskReward == null) return <span className="font-mono text-xs tabular-nums text-muted-foreground">—</span>;
  return (
    <span
      className={cn(
        "font-mono text-xs font-semibold tabular-nums",
        riskReward >= 2
          ? "text-emerald-600 dark:text-emerald-400"
          : riskReward >= 1
            ? "text-amber-600 dark:text-amber-400"
            : "text-destructive",
      )}
    >
      1:{riskReward.toFixed(2)}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const isBuy = type.toUpperCase().startsWith("BUY");
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
        isBuy ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500" : "border-red-500/30 bg-red-500/10 text-red-500",
      )}
    >
      {isBuy ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
      {type}
    </Badge>
  );
}

function Row({ label, value, muted }: { label: string; value: ReactNode; muted?: boolean }) {
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
        <Clock className="size-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground">No pending orders</p>
      <p className="text-xs text-muted-foreground">Limit and stop orders waiting to trigger will show here.</p>
    </div>
  );
}

type Props = {
  orders: LivePendingOrder[];
  equity: number | null;
};

export function PendingOrdersTable({ orders, equity }: Props) {
  const [modifyTarget, setModifyTarget] = useState<LivePendingOrder | null>(null);
  const [cancelling, setCancelling] = useState<Set<string>>(new Set());
  const [quickSlPending, setQuickSlPending] = useState<Set<string>>(new Set());
  const [quickTpPending, setQuickTpPending] = useState<Set<string>>(new Set());
  const [quotes, setQuotes] = useState<QuoteMap>({});
  const [, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch("/api/quotes");
        const data = (await res.json()) as QuotesApiResponse;
        if (cancelled || !Array.isArray(data.quotes)) return;
        const next: QuoteMap = {};
        for (const q of data.quotes) next[q.symbol] = { bid: q.bid, ask: q.ask };
        setQuotes(next);
      } catch {
        // keep last known quotes
      }
    };
    void poll();
    const id = setInterval(poll, 15_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  function handleCancel(ticket: string) {
    setCancelling((prev) => new Set(prev).add(ticket));
    startTransition(async () => {
      await cancelOrder(ticket);
    });
  }

  function handleQuickStopLoss(o: LivePendingOrder) {
    if (o.priceOpen == null || o.volume == null || equity == null) return;
    const isBuy = o.type.toUpperCase().startsWith("BUY");
    const stopLoss = estimateStopLossForRisk({
      symbol: o.symbol,
      isBuy,
      entryPrice: o.priceOpen,
      volume: o.volume,
      equity,
    });
    if (stopLoss == null) return;
    const rounded = roundToSymbolPrecision(stopLoss, o.symbol);
    setQuickSlPending((prev) => new Set(prev).add(o.ticket));
    startTransition(async () => {
      await modifyOrder(o.ticket, rounded, o.takeProfit);
    });
  }

  function handleQuickTakeProfit(o: LivePendingOrder) {
    if (o.priceOpen == null || o.volume == null || equity == null) return;
    const isBuy = o.type.toUpperCase().startsWith("BUY");
    const takeProfit = estimateTakeProfitForReward({
      symbol: o.symbol,
      isBuy,
      entryPrice: o.priceOpen,
      volume: o.volume,
      equity,
    });
    if (takeProfit == null) return;
    const rounded = roundToSymbolPrecision(takeProfit, o.symbol);
    setQuickTpPending((prev) => new Set(prev).add(o.ticket));
    startTransition(async () => {
      await modifyOrder(o.ticket, o.stopLoss, rounded);
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between px-3 py-4 sm:px-6">
        <h2 className="text-base font-semibold">Pending Orders</h2>
        <span className="text-xs text-muted-foreground">{orders.length} waiting</span>
      </div>

      {orders.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Desktop / tablet table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-190 border-collapse text-sm">
              <thead>
                <tr className="border-t border-border text-xs text-muted-foreground">
                  <th className="px-6 py-3 text-left font-medium">Ticket</th>
                  <th className="px-3 py-3 text-left font-medium">Symbol</th>
                  <th className="px-3 py-3 text-left font-medium">Type</th>
                  <th className="px-3 py-3 text-right font-medium">Lot</th>
                  <th className="px-3 py-3 text-right font-medium">Price</th>
                  <th className="px-3 py-3 text-right font-medium">SL</th>
                  <th className="px-3 py-3 text-right font-medium">TP</th>
                  <th className="px-3 py-3 text-right font-medium">R:R</th>
                  <th className="px-6 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const isCancelling = cancelling.has(o.ticket);
                  const isQuickSl = quickSlPending.has(o.ticket);
                  const isQuickTp = quickTpPending.has(o.ticket);
                  const isNear = isNearTrigger(o, quotes);
                  return (
                    <tr
                      key={o.ticket}
                      className={cn(
                        "border-t border-border transition-colors hover:bg-muted/40",
                        isCancelling && "opacity-40",
                        isNear && "bg-amber-400/10 hover:bg-amber-400/15 dark:bg-amber-400/5",
                      )}
                    >
                      <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{o.ticket}</td>
                      <td className="px-3 py-4 font-semibold">{o.symbol}</td>
                      <td className="px-3 py-4">
                        <TypeBadge type={o.type} />
                      </td>
                      <td className="px-3 py-4 text-right font-mono tabular-nums">{fmt(o.volume, 2)}</td>
                      <td className="px-3 py-4 text-right font-mono tabular-nums">
                        <span className="inline-flex items-center justify-end gap-1.5">
                          {isNear && <NearTriggerBadge />}
                          {fmt(o.priceOpen)}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-right font-mono tabular-nums text-muted-foreground">
                        <LevelValue value={o.stopLoss} />
                        <SlAmount o={o} />
                      </td>
                      <td className="px-3 py-4 text-right font-mono tabular-nums text-muted-foreground">
                        <LevelValue value={o.takeProfit} />
                        <TpAmount o={o} />
                      </td>
                      <td className="px-3 py-4 text-right">
                        <RiskRewardCell o={o} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuickStopLoss(o)}
                            disabled={isCancelling || isQuickSl || o.priceOpen == null || equity == null}
                            className="gap-1.5"
                            title="Set stop loss to 10% equity risk"
                          >
                            <Percent className="size-3.5" />
                            {isQuickSl ? "Queued" : "SL 10%"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuickTakeProfit(o)}
                            disabled={isCancelling || isQuickTp || o.priceOpen == null || equity == null}
                            className="gap-1.5"
                            title="Set take profit to 20% equity reward"
                          >
                            <Target className="size-3.5" />
                            {isQuickTp ? "Queued" : "TP 20%"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setModifyTarget(o)}
                            disabled={isCancelling}
                            className="gap-1.5"
                          >
                            Modify
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleCancel(o.ticket)}
                            disabled={isCancelling}
                            className="gap-1.5"
                          >
                            <Ban className="size-3.5" />
                            {isCancelling ? "Queued" : "Cancel"}
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
          <div className="flex flex-col gap-2 p-2 md:hidden">
            {orders.map((o) => {
              const isCancelling = cancelling.has(o.ticket);
              const isQuickSl = quickSlPending.has(o.ticket);
              const isQuickTp = quickTpPending.has(o.ticket);
              const isNear = isNearTrigger(o, quotes);
              return (
                <div
                  key={o.ticket}
                  className={cn(
                    "rounded-xl border border-border bg-background p-3 transition-opacity",
                    isCancelling && "opacity-40",
                    isNear && "border-amber-400/50 bg-amber-400/10 dark:bg-amber-400/5",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-semibold">{o.symbol}</span>
                      <TypeBadge type={o.type} />
                      {isNear && <NearTriggerBadge />}
                    </div>
                    <span className="font-mono text-[11px] text-muted-foreground">#{o.ticket}</span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
                    <Row label="Lot" value={fmt(o.volume, 2)} />
                    <Row label="Price" value={fmt(o.priceOpen)} />
                    <Row
                      label="SL"
                      value={
                        <span className="flex flex-col items-end">
                          <LevelValue value={o.stopLoss} />
                          <SlAmount o={o} />
                        </span>
                      }
                      muted
                    />
                    <Row
                      label="TP"
                      value={
                        <span className="flex flex-col items-end">
                          <LevelValue value={o.takeProfit} />
                          <TpAmount o={o} />
                        </span>
                      }
                      muted
                    />
                    <Row label="R:R" value={<RiskRewardCell o={o} />} muted />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleQuickStopLoss(o)}
                      disabled={isCancelling || isQuickSl || o.priceOpen == null || equity == null}
                      className="w-full gap-1.5"
                      title="Set stop loss to 10% equity risk"
                    >
                      <Percent className="size-3.5" />
                      {isQuickSl ? "Queued" : "SL 10%"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleQuickTakeProfit(o)}
                      disabled={isCancelling || isQuickTp || o.priceOpen == null || equity == null}
                      className="w-full gap-1.5"
                      title="Set take profit to 20% equity reward"
                    >
                      <Target className="size-3.5" />
                      {isQuickTp ? "Queued" : "TP 20%"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setModifyTarget(o)}
                      disabled={isCancelling}
                      className="w-full gap-1.5"
                    >
                      Modify
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleCancel(o.ticket)}
                      disabled={isCancelling}
                      className="w-full gap-1.5"
                    >
                      <Ban className="size-3.5" />
                      {isCancelling ? "Queued" : "Cancel"}
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
          entryPrice={modifyTarget.priceOpen}
          volume={modifyTarget.volume}
          isBuy={modifyTarget.type.toUpperCase().startsWith("BUY")}
          equity={equity}
          kind="order"
        />
      )}
    </div>
  );
}
