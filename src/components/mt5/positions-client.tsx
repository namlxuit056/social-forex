"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  AlertTriangle,
  Clock,
  Gauge,
  Globe,
  History,
  LineChart,
  ListChecks,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { getActiveTradingSessions } from "@/lib/mt5/trading-sessions";
import {
  DEFAULT_QUICK_ORDER_CONFIG,
  loadQuickOrderConfig,
  saveQuickOrderConfig,
  type QuickOrderConfig,
} from "@/lib/mt5/quick-order-config";
import { QUOTE_BY_SYMBOL } from "@/lib/quotes/definitions";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  closeAllPositions,
  placeOrder,
  setMt5AutoCloseBeforeWeekend,
  setMt5AutoCloseEndOfDay,
  setMt5CloseAllAtBreakeven,
  setMt5ScheduledClose,
} from "@/actions/mt5-commands";
import { setCopyTradingPaused } from "@/actions/copy-trade";
import { PositionsTable } from "./positions-table";
import { PendingOrdersTable } from "./pending-orders-table";
import { HistoryTable, type ClosedTrade } from "./history-table";
import { NewOrderDialog } from "./new-order-dialog";
import { QuickOrderSettingsDialog } from "./quick-order-settings-dialog";
import { PortfolioReviewPanel } from "./portfolio-review-panel";
import type { LivePosition, Mt5AccountInfo } from "@/app/[locale]/journal/journal-live-panel";
import type { LivePendingOrder, Mt5AccountResponse } from "@/app/api/mt5/account/route";
import type { Mt5LiveUpdate } from "@/lib/mt5/live-redis";
import type { TodayNewsEvent } from "@/lib/calendar/news-context-db";

const POSITIONS_POLL_MS = 8_000;

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
  initialHistory: ClosedTrade[];
  liveEnabled: boolean;
  newsEventsToday: TodayNewsEvent[];
};

export function PositionsClient({
  initialAccount,
  initialPositions,
  initialOrders,
  initialHistory,
  liveEnabled,
  newsEventsToday,
}: Props) {
  const [account, setAccount] = useState<Mt5AccountInfo | null>(initialAccount);
  const [positions, setPositions] = useState<LivePosition[]>(initialPositions);
  const [orders, setOrders] = useState<LivePendingOrder[]>(initialOrders);
  const [history, setHistory] = useState<ClosedTrade[]>(initialHistory);
  const [spinning, setSpinning] = useState(false);
  const [closeAllPending, startCloseAll] = useTransition();
  const [quickOrderPending, startQuickOrder] = useTransition();
  const [quickOrderSide, setQuickOrderSide] = useState<"BUY" | "SELL" | null>(null);
  const [autoClosePending, startAutoClose] = useTransition();
  const [autoCloseEodPending, startAutoCloseEod] = useTransition();
  const [closeAtBreakevenPending, startCloseAtBreakeven] = useTransition();
  const [scheduledClosePending, startScheduledClose] = useTransition();
  const [scheduledCloseTimeInput, setScheduledCloseTimeInput] = useState(
    initialAccount?.scheduledCloseTime ?? "22:00",
  );
  const [scheduledCloseTzInput, setScheduledCloseTzInput] = useState<"utc" | "vn">(
    initialAccount?.scheduledCloseTz ?? "vn",
  );
  const [copyTradingPausePending, startCopyTradingPause] = useTransition();
  const [activeSessions, setActiveSessions] = useState(() => getActiveTradingSessions());
  const [quickOrderConfig, setQuickOrderConfig] = useState<QuickOrderConfig>(DEFAULT_QUICK_ORDER_CONFIG);

  useEffect(() => {
    setQuickOrderConfig(loadQuickOrderConfig());
  }, []);

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
    setHistory(data.history ?? []);
  }, []);

  // Used for both the manual refresh button and the polling fallback below.
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

  // Redis-backed pushes carry account/positions/orders only (not history),
  // and don't know per-ticket trailing-stop config — preserve what we
  // already had for a ticket rather than dropping it on every live update.
  const applyLiveUpdate = useCallback((update: Mt5LiveUpdate) => {
    setAccount((prev) => (prev ? { ...prev, ...update.account } : prev));
    setPositions((prev) => {
      const trailingByTicket = new Map(prev.map((p) => [p.ticket, p.trailingPips]));
      return update.positions.map((p) => ({
        ...p,
        trailingPips: trailingByTicket.get(p.ticket) ?? null,
      }));
    });
    setOrders(update.orders);
    setSpinning(true);
    window.setTimeout(() => setSpinning(false), 400);
  }, []);

  // Sub-second live updates via a Redis-backed SSE stream — no Postgres
  // query happens for the life of the connection, unlike a naive SSE that
  // polls the DB (see the polling fallback below for when Redis isn't set up).
  useEffect(() => {
    if (!initialAccount || !liveEnabled) return;

    let source: EventSource | null = null;

    function handleMessage(event: MessageEvent<string>) {
      try {
        applyLiveUpdate(JSON.parse(event.data) as Mt5LiveUpdate);
      } catch {
        // ignore malformed payloads / heartbeat comments
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
      source?.close();
    };
  }, [initialAccount, liveEnabled, applyLiveUpdate]);

  // Plain fetch on an interval instead of a server-held SSE connection — an
  // open ReadableStream keeps its Prisma connection (and the Neon compute
  // behind it) alive for as long as the tab stays open, regardless of poll
  // frequency, which is far more expensive than short-lived polled requests.
  // Used only when Redis isn't configured (see `liveEnabled` above).
  useEffect(() => {
    if (!initialAccount || liveEnabled) return;

    let timer: number | null = null;

    function schedule() {
      if (timer != null) return;
      timer = window.setInterval(() => void fetchData(), POSITIONS_POLL_MS);
    }

    function stop() {
      if (timer != null) {
        window.clearInterval(timer);
        timer = null;
      }
    }

    function handleVisibility() {
      if (document.visibilityState === "visible") {
        void fetchData();
        schedule();
      } else {
        stop();
      }
    }

    if (document.visibilityState === "visible") schedule();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      stop();
    };
  }, [initialAccount, liveEnabled, fetchData]);

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

  function handleToggleAutoCloseEod() {
    const next = !account?.autoCloseEndOfDay;
    setAccount((prev) => (prev ? { ...prev, autoCloseEndOfDay: next } : prev));
    startAutoCloseEod(async () => {
      await setMt5AutoCloseEndOfDay(next);
    });
  }

  function handleToggleCloseAtBreakeven() {
    const next = !account?.closeAllAtBreakeven;
    setAccount((prev) => (prev ? { ...prev, closeAllAtBreakeven: next } : prev));
    startCloseAtBreakeven(async () => {
      await setMt5CloseAllAtBreakeven(next);
    });
  }

  function handleToggleScheduledClose() {
    const next = !account?.scheduledCloseEnabled;
    setAccount((prev) =>
      prev
        ? {
            ...prev,
            scheduledCloseEnabled: next,
            scheduledCloseTime: scheduledCloseTimeInput,
            scheduledCloseTz: scheduledCloseTzInput,
          }
        : prev,
    );
    startScheduledClose(async () => {
      await setMt5ScheduledClose({
        enabled: next,
        time: scheduledCloseTimeInput,
        tz: scheduledCloseTzInput,
      });
    });
  }

  function handleScheduledCloseTimeChange(value: string) {
    setScheduledCloseTimeInput(value);
    if (!account?.scheduledCloseEnabled) return;
    startScheduledClose(async () => {
      await setMt5ScheduledClose({ enabled: true, time: value, tz: scheduledCloseTzInput });
    });
  }

  function handleScheduledCloseTzChange(value: "utc" | "vn") {
    setScheduledCloseTzInput(value);
    if (!account?.scheduledCloseEnabled) return;
    startScheduledClose(async () => {
      await setMt5ScheduledClose({ enabled: true, time: scheduledCloseTimeInput, tz: value });
    });
  }

  function handleToggleCopyTradingPaused() {
    const next = !account?.copyTradingPaused;
    setAccount((prev) => (prev ? { ...prev, copyTradingPaused: next } : prev));
    startCopyTradingPause(async () => {
      await setCopyTradingPaused(next);
    });
  }

  function handleQuickOrder(orderType: "BUY" | "SELL") {
    setQuickOrderSide(orderType);
    startQuickOrder(async () => {
      const result = await placeOrder({
        symbol: quickOrderConfig.symbol,
        orderType,
        volume: quickOrderConfig.volume,
        price: null,
        stopLoss: null,
        takeProfit: null,
      });
      if (result.dailyLimitWarning || result.planWarning) {
        const lines: string[] = [];
        if (result.planWarning) {
          lines.push(
            result.planWarning.hasPlan
              ? `${result.planWarning.symbol} isn't in today's trading plan.`
              : `You haven't set a trading plan for today.`,
          );
        }
        if (result.dailyLimitWarning) {
          const { ordersPlacedToday, maxTrades } = result.dailyLimitWarning;
          lines.push(
            `You've placed ${ordersPlacedToday}/${maxTrades} orders today, hitting your daily limit.`,
          );
        }
        const proceed = window.confirm(`${lines.join("\n")}\n\nPlace this order anyway?`);
        if (proceed) {
          await placeOrder({
            symbol: quickOrderConfig.symbol,
            orderType,
            volume: quickOrderConfig.volume,
            price: null,
            stopLoss: null,
            takeProfit: null,
            confirmedOverLimit: true,
            confirmedNoPlan: true,
          });
        }
      }
      setQuickOrderSide(null);
    });
  }

  function handleSaveQuickOrderConfig(next: QuickOrderConfig) {
    setQuickOrderConfig(next);
    saveQuickOrderConfig(next);
  }

  const totalPL = positions.reduce((sum, p) => sum + (p.profit ?? 0), 0);
  const currency = account?.currency ?? "";
  const plTone = totalPL > 0 ? "profit" : totalPL < 0 ? "loss" : "default";
  const hasQueueable = positions.length > 0 || orders.length > 0;
  // Crypto trades 24/7 — only forex/metals/energy follow the weekday session calendar.
  const isCryptoQuickOrder = QUOTE_BY_SYMBOL[quickOrderConfig.symbol]?.group === "crypto";
  const marketClosed = !isCryptoQuickOrder && activeSessions.length === 0;

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
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger render={<span className="inline-flex" />}>
                  <Button
                    variant="outline"
                    disabled={quickOrderPending || marketClosed}
                    onClick={() => handleQuickOrder("BUY")}
                    className={cn(
                      "gap-1.5 border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-600 dark:text-emerald-400",
                      marketClosed && "cursor-not-allowed",
                    )}
                  >
                    <TrendingUp className="size-4" />
                    {quickOrderPending && quickOrderSide === "BUY"
                      ? "Queuing…"
                      : `Buy ${quickOrderConfig.volume} ${quickOrderConfig.symbol}`}
                  </Button>
                </TooltipTrigger>
                {marketClosed && <TooltipContent>Market is closed on weekends — orders cannot be filled</TooltipContent>}
              </Tooltip>
              <Tooltip>
                <TooltipTrigger render={<span className="inline-flex" />}>
                  <Button
                    variant="outline"
                    disabled={quickOrderPending || marketClosed}
                    onClick={() => handleQuickOrder("SELL")}
                    className={cn(
                      "gap-1.5 border-red-500/50 text-red-600 hover:bg-red-500/10 hover:text-red-600 dark:text-red-400",
                      marketClosed && "cursor-not-allowed",
                    )}
                  >
                    <TrendingDown className="size-4" />
                    {quickOrderPending && quickOrderSide === "SELL"
                      ? "Queuing…"
                      : `Sell ${quickOrderConfig.volume} ${quickOrderConfig.symbol}`}
                  </Button>
                </TooltipTrigger>
                {marketClosed && <TooltipContent>Market is closed on weekends — orders cannot be filled</TooltipContent>}
              </Tooltip>
            </TooltipProvider>
            <QuickOrderSettingsDialog config={quickOrderConfig} onSave={handleSaveQuickOrderConfig} />
            <NewOrderDialog />
            <div className="col-span-2 sm:contents">
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button
                    variant="destructive"
                    disabled={closeAllPending || !hasQueueable}
                    className="w-full gap-1.5 sm:flex-1 lg:flex-none"
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

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
          <div>
            <p className="text-sm font-medium text-foreground">Auto-close at end of day</p>
            <p className="text-xs text-muted-foreground">
              Automatically close all positions 1 hour before the trading day ends (Mon–Thu).
              Only works while this page is open at that time.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={account?.autoCloseEndOfDay ?? false}
            disabled={autoCloseEodPending || !account}
            onClick={handleToggleAutoCloseEod}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none disabled:opacity-50",
              account?.autoCloseEndOfDay ? "bg-primary" : "bg-muted",
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform",
                account?.autoCloseEndOfDay ? "translate-x-5" : "translate-x-0",
              )}
            />
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
          <div>
            <p className="text-sm font-medium text-foreground">Close all at breakeven</p>
            <p className="text-xs text-muted-foreground">
              Arm this while your total Open P/L is positive — if it drops back to 0 or below, all
              positions close automatically to protect the gain. Turns itself off after firing.
              Only works while this page is open.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={account?.closeAllAtBreakeven ?? false}
            disabled={closeAtBreakevenPending || !account}
            onClick={handleToggleCloseAtBreakeven}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none disabled:opacity-50",
              account?.closeAllAtBreakeven ? "bg-primary" : "bg-muted",
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform",
                account?.closeAllAtBreakeven ? "translate-x-5" : "translate-x-0",
              )}
            />
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Scheduled close</p>
            <p className="text-xs text-muted-foreground">
              Automatically close all positions at a set time every day. Only works while this
              page is open at that time.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="time"
              value={scheduledCloseTimeInput}
              disabled={scheduledClosePending || !account}
              onChange={(e) => handleScheduledCloseTimeChange(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
            />
            <select
              value={scheduledCloseTzInput}
              disabled={scheduledClosePending || !account}
              onChange={(e) => handleScheduledCloseTzChange(e.target.value as "utc" | "vn")}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
            >
              <option value="vn">VN time</option>
              <option value="utc">UTC</option>
            </select>
            <button
              type="button"
              role="switch"
              aria-checked={account?.scheduledCloseEnabled ?? false}
              disabled={scheduledClosePending || !account}
              onClick={handleToggleScheduledClose}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none disabled:opacity-50",
                account?.scheduledCloseEnabled ? "bg-primary" : "bg-muted",
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform",
                  account?.scheduledCloseEnabled ? "translate-x-5" : "translate-x-0",
                )}
              />
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
          <div>
            <p className="text-sm font-medium text-foreground">Pause copy-trading</p>
            <p className="text-xs text-muted-foreground">
              Your own trades still open normally. While paused, new trades won&apos;t be
              relayed to your copiers or announced on Telegram.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={account?.copyTradingPaused ?? false}
            disabled={copyTradingPausePending || !account}
            onClick={handleToggleCopyTradingPaused}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none disabled:opacity-50",
              account?.copyTradingPaused ? "bg-primary" : "bg-muted",
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform",
                account?.copyTradingPaused ? "translate-x-5" : "translate-x-0",
              )}
            />
          </button>
        </div>
      </div>

      <PortfolioReviewPanel positionCount={positions.length} />

      {/* Tabs: positions / pending orders */}
      <Tabs defaultValue="positions" className="gap-4">
        <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabsList className="h-auto w-max rounded-full bg-muted p-1">
            <TabsTrigger value="positions" className="shrink-0 gap-2 rounded-full px-4 py-1.5">
              <ListChecks className="size-4" />
              Positions
              <span className="flex min-w-5 items-center justify-center rounded-full bg-background px-1.5 text-xs font-semibold text-foreground">
                {positions.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="shrink-0 gap-2 rounded-full px-4 py-1.5">
              <Clock className="size-4" />
              <span className="sm:hidden">Orders</span>
              <span className="hidden sm:inline">Pending Orders</span>
              <span className="flex min-w-5 items-center justify-center rounded-full bg-background px-1.5 text-xs font-semibold text-foreground">
                {orders.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="history" className="shrink-0 gap-2 rounded-full px-4 py-1.5">
              <History className="size-4" />
              History
              <span className="flex min-w-5 items-center justify-center rounded-full bg-background px-1.5 text-xs font-semibold text-foreground">
                {history.length}
              </span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="positions">
          <PositionsTable
            positions={positions}
            currency={currency}
            equity={account?.equity ?? null}
            newsEventsToday={newsEventsToday}
          />
        </TabsContent>
        <TabsContent value="orders">
          <PendingOrdersTable orders={orders} equity={account?.equity ?? null} />
        </TabsContent>
        <TabsContent value="history">
          <HistoryTable trades={history} currency={currency} />
        </TabsContent>
      </Tabs>

      <p className="text-center text-xs text-muted-foreground">
        {liveEnabled
          ? "Live updates via realtime feed"
          : "Updates every few seconds while this page is open"}{" "}
        · Commands execute on next EA heartbeat
      </p>
    </div>
  );
}
