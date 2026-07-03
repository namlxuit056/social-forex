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
import { partialClosePosition } from "@/actions/mt5-commands";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ticket: string;
  symbol: string;
  maxVolume: number;
};

const QUICK_PERCENTS = [25, 50, 75];

export function PartialCloseDialog({ open, onOpenChange, ticket, symbol, maxVolume }: Props) {
  const [volume, setVolume] = useState((maxVolume / 2).toFixed(2));
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function setPercent(pct: number) {
    setVolume(((maxVolume * pct) / 100).toFixed(2));
  }

  function handleSubmit() {
    setError(null);
    const vol = Number(volume);
    if (!Number.isFinite(vol) || vol <= 0) {
      setError("Enter a valid volume");
      return;
    }
    if (vol >= maxVolume) {
      setError("Use Close instead to close the full position");
      return;
    }
    startTransition(async () => {
      const result = await partialClosePosition(ticket, vol);
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
          <DialogTitle>Partial Close {symbol} #{ticket}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="partial-volume">Volume to close (max {maxVolume})</Label>
            <Input
              id="partial-volume"
              type="number"
              step="any"
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {QUICK_PERCENTS.map((pct) => (
              <Button key={pct} type="button" variant="outline" size="sm" onClick={() => setPercent(pct)}>
                {pct}%
              </Button>
            ))}
          </div>
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
