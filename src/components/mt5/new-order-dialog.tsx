"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QUOTE_DEFINITIONS } from "@/lib/quotes/definitions";
import type { QuotesApiResponse } from "@/lib/quotes/types";
import { placeOrder, type PlaceOrderType } from "@/actions/mt5-commands";
import { estimateOrderRisk } from "@/lib/calculators";
import { SlAmountHint, TpAmountHint, RiskRewardPreview } from "./risk-reward-preview";

const ORDER_TYPE_OPTIONS: { value: PlaceOrderType; label: string }[] = [
  { value: "BUY", label: "Buy (Market)" },
  { value: "SELL", label: "Sell (Market)" },
  { value: "BUY_LIMIT", label: "Buy Limit" },
  { value: "SELL_LIMIT", label: "Sell Limit" },
  { value: "BUY_STOP", label: "Buy Stop" },
  { value: "SELL_STOP", label: "Sell Stop" },
];

export function NewOrderDialog() {
  const [open, setOpen] = useState(false);
  const [symbol, setSymbol] = useState("XAUUSD");
  const [orderType, setOrderType] = useState<PlaceOrderType>("BUY");
  const [volume, setVolume] = useState("0.01");
  const [price, setPrice] = useState("");
  const [sl, setSl] = useState("");
  const [tp, setTp] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dailyLimitWarning, setDailyLimitWarning] = useState<{
    ordersPlacedToday: number;
    maxTrades: number;
  } | null>(null);
  const [planWarning, setPlanWarning] = useState<{ symbol: string; hasPlan: boolean } | null>(null);
  const [riskWarning, setRiskWarning] = useState<{
    projectedPct: number;
    maxRiskPercent: number;
    riskUsedToday: number;
    newRisk: number;
    budget: number;
  } | null>(null);
  const [marketPrice, setMarketPrice] = useState<{ bid: number; ask: number } | null>(null);

  const isPendingType = orderType !== "BUY" && orderType !== "SELL";
  const isBuy = orderType.startsWith("BUY");

  // Market orders have no entry price field — fetch the live quote just to preview $ SL/TP/R:R.
  useEffect(() => {
    if (!open || isPendingType) return;
    let cancelled = false;
    fetch("/api/quotes")
      .then((res) => res.json() as Promise<QuotesApiResponse>)
      .then((data) => {
        if (cancelled) return;
        const quote = data.quotes.find((q) => q.symbol === symbol);
        setMarketPrice(quote ? { bid: quote.bid, ask: quote.ask } : null);
      })
      .catch(() => {
        if (!cancelled) setMarketPrice(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open, isPendingType, symbol]);

  const referencePrice = isPendingType
    ? (Number(price) || null)
    : (marketPrice ? (isBuy ? marketPrice.ask : marketPrice.bid) : null);

  const risk = useMemo(
    () =>
      estimateOrderRisk({
        symbol,
        isBuy,
        entryPrice: referencePrice,
        volume: Number(volume) || null,
        stopLoss: sl === "" ? null : Number(sl),
        takeProfit: tp === "" ? null : Number(tp),
      }),
    [symbol, isBuy, referencePrice, volume, sl, tp],
  );

  function handleSubmit(confirmed = false) {
    setError(null);
    if (!confirmed) {
      setDailyLimitWarning(null);
      setPlanWarning(null);
      setRiskWarning(null);
    }
    if (isPendingType && !price) {
      setError("price_required");
      return;
    }
    startTransition(async () => {
      const result = await placeOrder({
        symbol,
        orderType,
        volume: Number(volume),
        price: isPendingType ? Number(price) : null,
        stopLoss: sl === "" ? null : Number(sl),
        takeProfit: tp === "" ? null : Number(tp),
        confirmedOverLimit: confirmed,
        confirmedNoPlan: confirmed,
        confirmedOverRisk: confirmed,
      });
      if (result.dailyLimitWarning || result.planWarning || result.dailyRiskWarning) {
        setDailyLimitWarning(result.dailyLimitWarning ?? null);
        setPlanWarning(result.planWarning ?? null);
        setRiskWarning(result.dailyRiskWarning ?? null);
        return;
      }
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setPrice("");
      setSl("");
      setTp("");
      setDailyLimitWarning(null);
      setPlanWarning(null);
      setRiskWarning(null);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" className="gap-1.5" />}>
        <Plus className="size-4" />
        New Order
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Place order</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="order-symbol">Symbol</Label>
            <Select
              value={symbol}
              onValueChange={(value) => {
                if (!value) return;
                setSymbol(value);
                setPlanWarning(null);
                setDailyLimitWarning(null);
                setRiskWarning(null);
              }}
            >
              <SelectTrigger id="order-symbol" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUOTE_DEFINITIONS.map((d) => (
                  <SelectItem key={d.symbol} value={d.symbol}>
                    {d.symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="order-type">Order type</Label>
            <Select value={orderType} onValueChange={(v) => setOrderType(v as PlaceOrderType)}>
              <SelectTrigger id="order-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORDER_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="order-volume">Lot</Label>
              <Input
                id="order-volume"
                type="number"
                step="0.01"
                min="0.01"
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
              />
            </div>
            {isPendingType && (
              <div className="grid gap-1.5">
                <Label htmlFor="order-price">Entry price</Label>
                <Input
                  id="order-price"
                  type="number"
                  step="any"
                  placeholder="0.00000"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="order-sl">Stop Loss</Label>
              <Input
                id="order-sl"
                type="number"
                step="any"
                placeholder="Optional — auto 10% risk if blank"
                value={sl}
                onChange={(e) => setSl(e.target.value)}
              />
              <SlAmountHint amount={risk.slAmount} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="order-tp">Take Profit</Label>
              <Input
                id="order-tp"
                type="number"
                step="any"
                placeholder="Optional"
                value={tp}
                onChange={(e) => setTp(e.target.value)}
              />
              <TpAmountHint amount={risk.tpAmount} />
            </div>
          </div>

          <RiskRewardPreview riskReward={risk.riskReward} />

          {planWarning && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              {planWarning.hasPlan
                ? `${planWarning.symbol} isn't in today's trading plan.`
                : `You haven't set a trading plan for today.`}{" "}
              Trading an unplanned pair is a common discipline slip — place this order anyway?
            </p>
          )}
          {dailyLimitWarning && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              You&apos;ve placed {dailyLimitWarning.ordersPlacedToday}/{dailyLimitWarning.maxTrades} orders
              today, hitting the daily limit from your trading plan. Place this one anyway?
            </p>
          )}
          {riskWarning && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              This order pushes today&apos;s total risk to ~{riskWarning.projectedPct}% of your account
              (~${Math.round(riskWarning.riskUsedToday)} used + ~${Math.round(riskWarning.newRisk)} here),
              over your {riskWarning.maxRiskPercent}% daily plan limit. Place it anyway?
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <p className="text-xs text-muted-foreground">
            Command queued — MT5 EA executes on next poll.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          {dailyLimitWarning || planWarning || riskWarning ? (
            <Button variant="outline" onClick={() => handleSubmit(true)} disabled={isPending}>
              {isPending ? "Queuing…" : "Place anyway"}
            </Button>
          ) : (
            <Button onClick={() => handleSubmit(false)} disabled={isPending}>
              {isPending ? "Queuing…" : "Place order"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
