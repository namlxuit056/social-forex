"use client";

import { useState, useTransition } from "react";
import { ArrowDownRight, ArrowUpRight, Ban, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { cancelOrder } from "@/actions/mt5-commands";
import { ModifyDialog } from "./modify-dialog";
import type { LivePendingOrder } from "@/app/api/mt5/account/route";

function fmt(v: number | null, d = 5) {
  return v == null ? "—" : v.toFixed(d);
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

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
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
};

export function PendingOrdersTable({ orders }: Props) {
  const [modifyTarget, setModifyTarget] = useState<LivePendingOrder | null>(null);
  const [cancelling, setCancelling] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  function handleCancel(ticket: string) {
    setCancelling((prev) => new Set(prev).add(ticket));
    startTransition(async () => {
      await cancelOrder(ticket);
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
                  <th className="px-6 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const isCancelling = cancelling.has(o.ticket);
                  return (
                    <tr key={o.ticket} className={cn("border-t border-border transition-colors hover:bg-muted/40", isCancelling && "opacity-40")}>
                      <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{o.ticket}</td>
                      <td className="px-3 py-4 font-semibold">{o.symbol}</td>
                      <td className="px-3 py-4">
                        <TypeBadge type={o.type} />
                      </td>
                      <td className="px-3 py-4 text-right font-mono tabular-nums">{fmt(o.volume, 2)}</td>
                      <td className="px-3 py-4 text-right font-mono tabular-nums">{fmt(o.priceOpen)}</td>
                      <td className="px-3 py-4 text-right font-mono tabular-nums text-muted-foreground">{fmt(o.stopLoss)}</td>
                      <td className="px-3 py-4 text-right font-mono tabular-nums text-muted-foreground">{fmt(o.takeProfit)}</td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
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
              return (
                <div key={o.ticket} className={cn("rounded-xl border border-border bg-background p-3 transition-opacity", isCancelling && "opacity-40")}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-semibold">{o.symbol}</span>
                      <TypeBadge type={o.type} />
                    </div>
                    <span className="font-mono text-[11px] text-muted-foreground">#{o.ticket}</span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
                    <Row label="Lot" value={fmt(o.volume, 2)} />
                    <Row label="Price" value={fmt(o.priceOpen)} />
                    <Row label="SL" value={fmt(o.stopLoss)} muted />
                    <Row label="TP" value={fmt(o.takeProfit)} muted />
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setModifyTarget(o)}
                      disabled={isCancelling}
                      className="flex-1 gap-1.5"
                    >
                      Modify
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleCancel(o.ticket)}
                      disabled={isCancelling}
                      className="flex-1 gap-1.5"
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
          kind="order"
        />
      )}
    </div>
  );
}
