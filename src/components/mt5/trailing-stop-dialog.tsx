"use client";

import { useState, useTransition } from "react";
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
import { enableTrailingStop, disableTrailingStop } from "@/actions/trailing-stop";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ticket: string;
  symbol: string;
  currentDistancePips: number | null;
};

export function TrailingStopDialog({ open, onOpenChange, ticket, symbol, currentDistancePips }: Props) {
  const [distancePips, setDistancePips] = useState(currentDistancePips?.toString() ?? "20");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isEnabled = currentDistancePips != null;

  function handleEnable() {
    setError(null);
    const pips = Number(distancePips);
    if (!Number.isFinite(pips) || pips <= 0) {
      setError("Enter a valid pip distance");
      return;
    }
    startTransition(async () => {
      const result = await enableTrailingStop(ticket, pips);
      if (result.error) {
        setError(result.error);
        return;
      }
      onOpenChange(false);
    });
  }

  function handleDisable() {
    setError(null);
    startTransition(async () => {
      const result = await disableTrailingStop(ticket);
      if (result.error) {
        setError(result.error);
        return;
      }
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Trailing Stop {symbol} #{ticket}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="trailing-distance">Distance (pips)</Label>
            <Input
              id="trailing-distance"
              type="number"
              step="any"
              value={distancePips}
              onChange={(e) => setDistancePips(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <p className="text-xs text-muted-foreground">
            Automatically moves Stop Loss as price moves in your favor. Checked every ~1 minute.
          </p>
        </div>
        <DialogFooter>
          {isEnabled && (
            <Button variant="outline" onClick={handleDisable} disabled={isPending}>
              Disable Trailing
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleEnable} disabled={isPending}>
            {isPending ? "Queuing…" : isEnabled ? "Update" : "Enable"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
