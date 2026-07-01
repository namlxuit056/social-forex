"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { RefreshCw, TrendingDown, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { closeAllPositions } from "@/actions/mt5-commands";
import { PositionsTable } from "./positions-table";
import { PendingOrdersTable } from "./pending-orders-table";
import type { LivePosition, Mt5AccountInfo } from "@/app/[locale]/journal/journal-live-panel";
import type { LivePendingOrder, Mt5AccountResponse } from "@/app/api/mt5/account/route";

const REFRESH_MS = 5_000;

type Props = {
  initialAccount: Mt5AccountInfo | null;
  initialPositions: LivePosition[];
  initialOrders: LivePendingOrder[];
};

export function PositionsClient({ initialAccount, initialPositions, initialOrders }: Props) {
  const [account, setAccount] = useState<Mt5AccountInfo | null>(initialAccount);
  const [positions, setPositions] = useState<LivePosition[]>(initialPositions);
  const [orders, setOrders] = useState<LivePendingOrder[]>(initialOrders);
  const [spinning, setSpinning] = useState(false);
  const [closeAllPending, startCloseAll] = useTransition();
  const timerRef = useRef<number | null>(null);

  const fetchData = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    setSpinning(true);
    try {
      const res = await fetch("/api/mt5/account", { credentials: "include" });
      if (!res.ok) return;
      const data = (await res.json()) as Mt5AccountResponse;
      setAccount(data.account);
      setPositions(data.positions);
      setOrders(data.orders ?? []);
    } catch {
      // silent — keep showing last known data
    } finally {
      window.setTimeout(() => setSpinning(false), 400);
    }
  }, []);

  useEffect(() => {
    if (!initialAccount) return;
    timerRef.current = window.setInterval(() => void fetchData(), REFRESH_MS);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [initialAccount, fetchData]);

  function handleCloseAll() {
    startCloseAll(async () => {
      await closeAllPositions();
    });
  }

  const totalPL = positions.reduce((sum, p) => sum + (p.profit ?? 0), 0);
  const currency = account?.currency ?? "";

  return (
    <div className="space-y-6">
      {/* Account summary strip */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border/60 bg-card px-4 py-3">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Balance</span>
          <span className="font-semibold">{account?.balance?.toFixed(2) ?? "—"} {currency}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Equity</span>
          <span className="font-semibold">{account?.equity?.toFixed(2) ?? "—"} {currency}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Free Margin</span>
          <span className="font-semibold">{account?.freeMargin?.toFixed(2) ?? "—"} {currency}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Open P/L</span>
          <span className={cn("font-semibold", totalPL >= 0 ? "text-emerald-500" : "text-red-500")}>
            {totalPL >= 0 ? "+" : ""}{totalPL.toFixed(2)} {currency}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void fetchData()}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={cn("h-4 w-4", spinning && "animate-spin")} />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={closeAllPending || (positions.length === 0 && orders.length === 0)}
                  className="gap-1.5"
                />
              }
            >
              <TrendingDown className="h-4 w-4" />
              Close All
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Close all positions?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This queues a CLOSE_ALL command. Your MT5 EA will close {positions.length} position{positions.length !== 1 ? "s" : ""} and cancel {orders.length} pending order{orders.length !== 1 ? "s" : ""} on the next heartbeat. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleCloseAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {closeAllPending ? "Queuing…" : "Yes, close all"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Tabs: positions / pending orders */}
      <Tabs defaultValue="positions">
        <TabsList>
          <TabsTrigger value="positions">
            Positions
            {positions.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                {positions.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="orders">
            Pending Orders
            {orders.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                {orders.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="positions">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Open Positions</CardTitle>
            </CardHeader>
            <CardContent>
              <PositionsTable positions={positions} currency={currency} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="orders">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Pending Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <PendingOrdersTable orders={orders} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <p className="text-center text-xs text-muted-foreground">
        Auto-refreshes every 5s · Commands execute on next EA heartbeat
      </p>
    </div>
  );
}
