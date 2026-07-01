"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { closePosition } from "@/actions/mt5-commands";
import { ModifyDialog } from "./modify-dialog";
import type { LivePendingOrder } from "@/app/api/mt5/account/route";

function fmt(v: number | null, d = 5) {
  return v == null ? "—" : v.toFixed(d);
}

type Props = {
  orders: LivePendingOrder[];
};

export function PendingOrdersTable({ orders }: Props) {
  const [modifyTarget, setModifyTarget] = useState<LivePendingOrder | null>(null);
  const [cancelling, setCancelling] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  function handleCancel(ticket: string) {
    setCancelling((prev) => new Set(prev).add(ticket));
    startTransition(async () => {
      await closePosition(ticket);
    });
  }

  if (orders.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No pending orders.
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
              <th className="pb-2 pr-3 text-right font-medium">SL</th>
              <th className="pb-2 pr-3 text-right font-medium">TP</th>
              <th className="pb-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {orders.map((o) => {
              const isBuy = o.type.toUpperCase().startsWith("BUY");
              const isCancelling = cancelling.has(o.ticket);
              return (
                <tr key={o.ticket} className={cn("transition-opacity", isCancelling && "opacity-40")}>
                  <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">{o.ticket}</td>
                  <td className="py-2 pr-3 font-semibold">{o.symbol}</td>
                  <td className="py-2 pr-3">
                    <Badge variant={isBuy ? "default" : "destructive"} className="text-xs">
                      {o.type}
                    </Badge>
                  </td>
                  <td className="py-2 pr-3 text-right font-mono">{fmt(o.volume, 2)}</td>
                  <td className="py-2 pr-3 text-right font-mono">{fmt(o.priceOpen)}</td>
                  <td className="py-2 pr-3 text-right font-mono text-muted-foreground">{fmt(o.stopLoss)}</td>
                  <td className="py-2 pr-3 text-right font-mono text-muted-foreground">{fmt(o.takeProfit)}</td>
                  <td className="py-2 text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        onClick={() => setModifyTarget(o)}
                        disabled={isCancelling}
                      >
                        Modify
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7 px-2 text-xs"
                        onClick={() => handleCancel(o.ticket)}
                        disabled={isCancelling}
                      >
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
