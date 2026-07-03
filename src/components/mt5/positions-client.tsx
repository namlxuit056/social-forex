"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  AlertTriangle,
  Clock,
  Gauge,
  Globe,
  LineChart,
  ListChecks,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { getActiveTradingSessions } from "@/lib/mt5/trading-sessions";
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
import { closeAllPositions, placeOrder, setMt5AutoCloseBeforeWeekend } from "@/actions/mt5-commands";
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
  const [quickOrderPending, startQuickOrder] = useTransition();
  const [quickOrderSide, setQuickOrderSide] = useState<"BUY" | "SELL" | null>(null);
  const [autoClosePending, startAutoClose] = useTransition();
  const [activeSessions, setActiveSessions] = useState(() => getActiveTradingSessions());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSessions(getActiveTradingSessions());
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

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

  function handleToggleAutoClose() {
    const next = !account?.autoCloseBeforeWeekend;
    setAccount((prev) => (prev ? { ...prev, autoCloseBeforeWeekend: next } : prev));
    startAutoClose(async () => {
      await setMt5AutoCloseBeforeWeekend(next);
    });
  }

  function handleQuickGoldOrder(orderType: "BUY" | "SELL") {
    setQuickOrderSide(orderType);
    startQuickOrder(async () => {
      await placeOrder({
        symbol: "XAUUSD",
        orderType,
        volume: 0.02,
        price: null,
        stopLoss: null,
        takeProfit: null,
      });
      setQuickOrderSide(null);
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
        <div className="mb-4 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Globe className="size-3.5" />
          {activeSessions.length > 0 ? (
            <span>
              Active session{activeSessions.length > 1 ? "s" : ""}:{" "}
              <span className="text-foreground">{activeSessions.map((s) => s.label).join(" + ")}</span>
            </span>
          ) : (
            <span>Market closed (weekend)</span>
          )}
        </div>
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

          <div className="grid grid-cols-2 gap-2 border-t border-border pt-4 sm:flex sm:flex-wrap sm:items-center lg:flex-nowrap lg:border-t-0 lg:pt-0">
            {/* <Button
              variant="outline"
              size="icon"
              onClick={() => void fetchData()}
              aria-label="Refresh account data"
              className="shrink-0"
            >
              <RefreshCw className={cn("size-4", spinning && "animate-spin")} />
            </Button> */}
            <Button
              variant="outline"
              disabled={quickOrderPending}
              onClick={() => handleQuickGoldOrder("BUY")}
              className="gap-1.5 border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-600 dark:text-emerald-400"
            >
              <TrendingUp className="size-4" />
              {quickOrderPending && quickOrderSide === "BUY" ? "Queuing…" : "Buy 0.02 XAU"}
            </Button>
            <Button
              variant="outline"
              disabled={quickOrderPending}
              onClick={() => handleQuickGoldOrder("SELL")}
              className="gap-1.5 border-red-500/50 text-red-600 hover:bg-red-500/10 hover:text-red-600 dark:text-red-400"
            >
              <TrendingDown className="size-4" />
              {quickOrderPending && quickOrderSide === "SELL" ? "Queuing…" : "Sell 0.02 XAU"}
            </Button>
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

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
          <div>
            <p className="text-sm font-medium text-foreground">Auto-close before weekend</p>
            <p className="text-xs text-muted-foreground">
              Automatically close all positions 1 hour before the forex market closes on Friday.
              Only works while this page is open at that time.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={account?.autoCloseBeforeWeekend ?? false}
            disabled={autoClosePending || !account}
            onClick={handleToggleAutoClose}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none disabled:opacity-50",
              account?.autoCloseBeforeWeekend ? "bg-primary" : "bg-muted",
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform",
                account?.autoCloseBeforeWeekend ? "translate-x-5" : "translate-x-0",
              )}
            />
          </button>
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
