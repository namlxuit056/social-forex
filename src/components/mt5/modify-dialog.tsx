"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { modifyOrder, modifyPosition } from "@/actions/mt5-commands";
import {
  estimateOrderRisk,
  estimateStopLossForRisk,
  estimateTakeProfitForReward,
  roundToSymbolPrecision,
} from "@/lib/calculators";
import { SlAmountHint, TpAmountHint, RiskRewardPreview } from "./risk-reward-preview";

const PCT_PRESETS = [1, 2, 5, 10, 20];

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ticket: string;
  symbol: string;
  currentSl: number | null;
  currentTp: number | null;
  entryPrice?: number | null;
  volume?: number | null;
  isBuy?: boolean;
  /** Account equity — enables the %-of-account quick-set buttons for SL/TP. */
  equity?: number | null;
  kind?: "position" | "order";
  onQueued?: () => void;
};

export function ModifyDialog({
  open,
  onOpenChange,
  ticket,
  symbol,
  currentSl,
  currentTp,
  entryPrice = null,
  volume = null,
  isBuy = true,
  equity = null,
  kind = "position",
  onQueued,
}: Props) {
  const [sl, setSl] = useState(currentSl?.toString() ?? "");
  const [tp, setTp] = useState(currentTp?.toString() ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const canQuickSet =
    entryPrice != null && entryPrice > 0 && volume != null && volume > 0 && equity != null && equity > 0;

  function applySlPct(pct: number) {
    if (!canQuickSet) return;
    const price = estimateStopLossForRisk({
      symbol,
      isBuy,
      entryPrice: entryPrice as number,
      volume: volume as number,
      equity: equity as number,
      riskPct: pct,
    });
    if (price != null) setSl(String(roundToSymbolPrecision(price, symbol)));
  }

  function applyTpPct(pct: number) {
    if (!canQuickSet) return;
    const price = estimateTakeProfitForReward({
      symbol,
      isBuy,
      entryPrice: entryPrice as number,
      volume: volume as number,
      equity: equity as number,
      rewardPct: pct,
    });
    if (price != null) setTp(String(roundToSymbolPrecision(price, symbol)));
  }

  const risk = useMemo(
    () =>
      estimateOrderRisk({
        symbol,
        isBuy,
        entryPrice,
        volume,
        stopLoss: sl === "" ? null : Number(sl),
        takeProfit: tp === "" ? null : Number(tp),
      }),
    [symbol, isBuy, entryPrice, volume, sl, tp],
  );

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const slVal = sl === "" ? null : Number(sl);
      const tpVal = tp === "" ? null : Number(tp);
      const result = kind === "order"
        ? await modifyOrder(ticket, slVal, tpVal)
        : await modifyPosition(ticket, slVal, tpVal);
      if (result.error) {
        setError(result.error);
        return;
      }
      onOpenChange(false);
      onQueued?.();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Modify {symbol} #{ticket}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="sl">Stop Loss</Label>
            <Input
              id="sl"
              type="number"
              step="any"
              placeholder="0 = remove"
              value={sl}
              onChange={(e) => setSl(e.target.value)}
            />
            {canQuickSet && (
              <div className="flex flex-wrap gap-1">
                <span className="self-center text-[11px] text-muted-foreground">Risk % of account:</span>
                {PCT_PRESETS.map((pct) => (
                  <Button
                    key={pct}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => applySlPct(pct)}
                  >
                    {pct}%
                  </Button>
                ))}
              </div>
            )}
            <SlAmountHint amount={risk.slAmount} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="tp">Take Profit</Label>
            <Input
              id="tp"
              type="number"
              step="any"
              placeholder="0 = remove"
              value={tp}
              onChange={(e) => setTp(e.target.value)}
            />
            {canQuickSet && (
              <div className="flex flex-wrap gap-1">
                <span className="self-center text-[11px] text-muted-foreground">Reward % of account:</span>
                {PCT_PRESETS.map((pct) => (
                  <Button
                    key={pct}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => applyTpPct(pct)}
                  >
                    {pct}%
                  </Button>
                ))}
              </div>
            )}
            <TpAmountHint amount={risk.tpAmount} />
          </div>
          <RiskRewardPreview riskReward={risk.riskReward} />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <p className="text-xs text-muted-foreground">
            Command queued — MT5 EA executes on next heartbeat.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Queuing…" : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
