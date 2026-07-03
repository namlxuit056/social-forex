"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LivePosition } from "@/app/[locale]/journal/journal-live-panel";

function isAtBreakeven(p: LivePosition) {
  return p.priceOpen != null && p.stopLoss != null && Math.abs(p.stopLoss - p.priceOpen) < 1e-8;
}

type Props = {
  position: LivePosition;
  disabled: boolean;
  queued: boolean;
  onLock: (ticket: string, newSl: number) => void;
  className?: string;
};

export function LockProfitMenu({ position: p, disabled, queued, onLock, className }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const atBreakeven = isAtBreakeven(p);
  const canMoveBE = p.priceOpen != null;

  const isBuy = p.type.toUpperCase().startsWith("BUY");
  const dir = isBuy ? 1 : -1;
  const profitDistance =
    p.priceCurrent != null && p.priceOpen != null ? (p.priceCurrent - p.priceOpen) * dir : 0;
  const inProfit = profitDistance > 0;

  function lockFraction(fraction: number) {
    if (p.priceOpen == null || !inProfit) return;
    const newSl = Number((p.priceOpen + dir * (fraction * profitDistance)).toFixed(5));
    setOpen(false);
    onLock(p.ticket, newSl);
  }

  function moveToBreakeven() {
    if (p.priceOpen == null) return;
    setOpen(false);
    onLock(p.ticket, p.priceOpen);
  }

  return (
    <div ref={ref} className={cn("relative", className)}>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled || queued || atBreakeven || !canMoveBE}
        className="w-full gap-1.5"
        title="Move stop loss to lock in profit"
      >
        <Lock className="size-3.5" />
        {queued ? "Queued" : atBreakeven ? "At BE" : "BE"}
        <ChevronDown className="size-3.5" />
      </Button>
      {open && (
        <div className="absolute left-0 z-20 mt-1 w-44 rounded-lg border border-border bg-popover p-1 text-sm shadow-md md:left-auto md:right-0 md:w-48">
          <button
            type="button"
            onClick={moveToBreakeven}
            className="block w-full rounded-md px-2.5 py-1.5 text-left text-xs hover:bg-accent hover:text-accent-foreground"
          >
            Move to Breakeven
          </button>
          <button
            type="button"
            onClick={() => lockFraction(0.5)}
            disabled={!inProfit}
            className="block w-full rounded-md px-2.5 py-1.5 text-left text-xs hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-40"
          >
            Lock 50% profit
          </button>
          <button
            type="button"
            onClick={() => lockFraction(1)}
            disabled={!inProfit}
            className="block w-full rounded-md px-2.5 py-1.5 text-left text-xs hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-40"
          >
            Lock 100% profit
          </button>
        </div>
      )}
    </div>
  );
}
