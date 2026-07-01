"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { closePosition } from "@/actions/mt5-commands";
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

type Props = {
  positions: LivePosition[];
  currency: string | null;
};

export function PositionsTable({ positions, currency }: Props) {
  const [modifyTarget, setModifyTarget] = useState<LivePosition | null>(null);
  const [closing, setClosing] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  function handleClose(ticket: string) {
    setClosing((prev) => new Set(prev).add(ticket));
    startTransition(async () => {
      await closePosition(ticket);
    });
  }

  if (positions.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No open positions.
      </p>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 text-xs text-muted-foreground">
              <th className="pb-2 pr-3 text-left font-medium">Ticket</th>
              <th className="pb-2 pr-3 text-left font-medium">Symbol</th>
              <th className="pb-2 pr-3 text-left font-medium">Type</th>
              <th className="pb-2 pr-3 text-right font-medium">Lot</th>
              <th className="pb-2 pr-3 text-right font-medium">Entry</th>
              <th className="pb-2 pr-3 text-right font-medium">Current</th>
              <th className="pb-2 pr-3 text-right font-medium">SL</th>
              <th className="pb-2 pr-3 text-right font-medium">TP</th>
              <th className="pb-2 pr-3 text-right font-medium">P/L {currency ?? ""}</th>
              <th className="pb-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {positions.map((p) => {
              const isBuy = p.type.toUpperCase().startsWith("BUY");
              const profit = p.profit ?? 0;
              const isClosing = closing.has(p.ticket);
              return (
                <tr key={p.ticket} className={cn("transition-opacity", isClosing && "opacity-40")}>
                  <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">{p.ticket}</td>
                  <td className="py-2 pr-3 font-semibold">{p.symbol}</td>
                  <td className="py-2 pr-3">
                    <Badge variant={isBuy ? "default" : "destructive"} className="text-xs">
                      {p.type}
                    </Badge>
                  </td>
                  <td className="py-2 pr-3 text-right font-mono">{fmt(p.volume, 2)}</td>
                  <td className="py-2 pr-3 text-right font-mono">{fmt(p.priceOpen)}</td>
                  <td className="py-2 pr-3 text-right font-mono">{fmt(p.priceCurrent)}</td>
                  <td className="py-2 pr-3 text-right font-mono text-muted-foreground">{fmt(p.stopLoss)}</td>
                  <td className="py-2 pr-3 text-right font-mono text-muted-foreground">{fmt(p.takeProfit)}</td>
                  <td className={cn("py-2 pr-3 text-right font-mono font-semibold", profit >= 0 ? "text-emerald-500" : "text-red-500")}>
                    {fmtProfit(p.profit)}
                  </td>
                  <td className="py-2 text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        onClick={() => setModifyTarget(p)}
                        disabled={isClosing}
                      >
                        Modify
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7 px-2 text-xs"
                        onClick={() => handleClose(p.ticket)}
                        disabled={isClosing}
                      >
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
    </>
  );
}
