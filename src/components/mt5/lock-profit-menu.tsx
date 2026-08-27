"use client";

import { ChevronDown, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
    onLock(p.ticket, newSl);
  }

  function moveToBreakeven() {
    if (p.priceOpen == null) return;
    onLock(p.ticket, p.priceOpen);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            size="sm"
            variant="outline"
            disabled={disabled || queued || atBreakeven || !canMoveBE}
            className={cn("gap-1.5", className)}
            title="Move stop loss to lock in profit"
          />
        }
      >
        <Lock className="size-3.5" />
        {queued ? "Queued" : atBreakeven ? "At BE" : "BE"}
        <ChevronDown className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48">
        <DropdownMenuItem onClick={moveToBreakeven}>Move to Breakeven</DropdownMenuItem>
        <DropdownMenuItem onClick={() => lockFraction(0.5)} disabled={!inProfit}>
          Lock 50% profit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => lockFraction(1)} disabled={!inProfit}>
          Lock 100% profit
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
