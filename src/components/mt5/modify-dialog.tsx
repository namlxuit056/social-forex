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
import { modifyPosition } from "@/actions/mt5-commands";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ticket: string;
  symbol: string;
  currentSl: number | null;
  currentTp: number | null;
  onQueued?: () => void;
};

export function ModifyDialog({ open, onOpenChange, ticket, symbol, currentSl, currentTp, onQueued }: Props) {
  const [sl, setSl] = useState(currentSl?.toString() ?? "");
  const [tp, setTp] = useState(currentTp?.toString() ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const slVal = sl === "" ? null : Number(sl);
      const tpVal = tp === "" ? null : Number(tp);
      const result = await modifyPosition(ticket, slVal, tpVal);
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
