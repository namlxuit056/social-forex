"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  AlertTriangle,
  Clock,
  Gauge,
  LineChart,
  ListChecks,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { NewOrderDialog } from "./new-order-dialog";
import { PortfolioReviewPanel } from "./portfolio-review-panel";
import type { LivePosition, Mt5AccountInfo } from "@/app/[locale]/journal/journal-live-panel";
import type { LivePendingOrder, Mt5AccountResponse } from "@/app/api/mt5/account/route";

function fmtMoney(v: number | null, currency: string) {
  if (v == null) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)} ${currency}`.trim();
}

function Metric({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: "default" | "profit" | "loss";
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </span>
      <span
        className={cn(
          "text-lg font-semibold tabular-nums tracking-tight sm:text-xl",
          tone === "profit" && "text-emerald-500",
          tone === "loss" && "text-red-500",
        )}
      >
        {value}
      </span>
    </div>
  );
}

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

  const applySnapshot = useCallback((data: Mt5AccountResponse) => {
    setAccount(data.account);
    setPositions(data.positions);
    setOrders(data.orders ?? []);
  }, []);

  // Manual refresh button - the automatic updates below come from the SSE stream.
  const fetchData = useCallback(async () => {
    setSpinning(true);
    try {
      const res = await fetch("/api/mt5/account", { credentials: "include" });
      if (!res.ok) return;
      const data = (await res.json()) as Mt5AccountResponse;
      applySnapshot(data);
    } catch {
      // silent — keep showing last known data
    } finally {
      window.setTimeout(() => setSpinning(false), 400);
    }
  }, [applySnapshot]);

  useEffect(() => {
    if (!initialAccount) return;

    let source: EventSource | null = null;
    let spinTimeout: number | null = null;

    function handleMessage(event: MessageEvent<string>) {
      try {
        const data = JSON.parse(event.data) as Mt5AccountResponse;
        applySnapshot(data);
        setSpinning(true);
        if (spinTimeout) window.clearTimeout(spinTimeout);
        spinTimeout = window.setTimeout(() => setSpinning(false), 400);
      } catch {
        // ignore malformed payloads
      }
    }

    function connect() {
      source = new EventSource("/api/mt5/account/stream");
      source.onmessage = handleMessage;
    }

    function handleVisibility() {
      if (document.visibilityState === "visible") {
        if (!source) connect();
      } else {
        source?.close();
        source = null;
      }
    }

    if (document.visibilityState === "visible") connect();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      if (spinTimeout) window.clearTimeout(spinTimeout);
      source?.close();
    };
  }, [initialAccount, applySnapshot]);

  function handleCloseAll() {
    startCloseAll(async () => {
      await closeAllPositions();
    });
  }

  const totalPL = positions.reduce((sum, p) => sum + (p.profit ?? 0), 0);
  const currency = account?.currency ?? "";
  const plTone = totalPL > 0 ? "profit" : totalPL < 0 ? "loss" : "default";
  const hasQueueable = positions.length > 0 || orders.length > 0;

  return (
    <div className="space-y-6">
      {/* Account summary */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-8 lg:flex-1">
            <Metric label="Balance" icon={Wallet} value={fmtMoney(account?.balance ?? null, currency)} />
            <Metric label="Equity" icon={LineChart} value={fmtMoney(account?.equity ?? null, currency)} />
            <Metric label="Free Margin" icon={Gauge} value={fmtMoney(account?.freeMargin ?? null, currency)} />
            <Metric
              label="Open P/L"
              icon={plTone === "loss" ? TrendingDown : TrendingUp}
              value={fmtMoney(totalPL, currency)}
              tone={plTone}
            />
          </div>

          <div className="flex items-center gap-2 border-t border-border pt-4 lg:border-t-0 lg:pt-0">
            {/* <Button
              variant="outline"
              size="icon"
              onClick={() => void fetchData()}
              aria-label="Refresh account data"
              className="shrink-0"
            >
              <RefreshCw className={cn("size-4", spinning && "animate-spin")} />
            </Button> */}
            <NewOrderDialog />
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button
                    variant="destructive"
                    disabled={closeAllPending || !hasQueueable}
                    className="flex-1 gap-1.5 lg:flex-none"
                  />
                }
              >
                <TrendingDown className="size-4" />
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
      </div>

      <PortfolioReviewPanel positionCount={positions.length} />

      {/* Tabs: positions / pending orders */}
      <Tabs defaultValue="positions" className="gap-4">
        <TabsList className="h-auto rounded-full bg-muted p-1">
          <TabsTrigger value="positions" className="gap-2 rounded-full px-4 py-1.5">
            <ListChecks className="size-4" />
            Positions
            <span className="flex min-w-5 items-center justify-center rounded-full bg-background px-1.5 text-xs font-semibold text-foreground">
              {positions.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-2 rounded-full px-4 py-1.5">
            <Clock className="size-4" />
            Pending Orders
            <span className="flex min-w-5 items-center justify-center rounded-full bg-background px-1.5 text-xs font-semibold text-foreground">
              {orders.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="positions">
          <PositionsTable positions={positions} currency={currency} equity={account?.equity ?? null} />
        </TabsContent>
        <TabsContent value="orders">
          <PendingOrdersTable orders={orders} />
        </TabsContent>
      </Tabs>

      <p className="text-center text-xs text-muted-foreground">
        Live updates via realtime feed · Commands execute on next EA heartbeat
      </p>
    </div>
  );
}
