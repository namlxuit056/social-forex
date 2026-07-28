"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Activity, RefreshCw, TrendingUp, Wallet, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { Mt5AccountResponse } from "@/app/api/mt5/account/route";

export type LivePosition = {
  ticket: string;
  symbol: string;
  type: string;
  volume: number | null;
  priceOpen: number | null;
  priceCurrent: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  profit: number | null;
  swap: number | null;
  openedAt: string | null;
  trailingPips: number | null;
};

export type Mt5AccountInfo = {
  balance: number | null;
  equity: number | null;
  margin: number | null;
  freeMargin: number | null;
  currency: string | null;
  openPositions: number;
  lastSeenAt: string | null;
  autoCloseBeforeWeekend: boolean;
  copyTradingPaused: boolean;
};

interface Props {
  account: Mt5AccountInfo | null;
  positions: LivePosition[];
  locale: string;
}

function fmt(value: number | null, digits = 2): string {
  return value == null ? "—" : value.toFixed(digits);
}

export function JournalLivePanel({ account: initialAccount, positions: initialPositions, locale }: Props) {
  const t = useTranslations("journal");
  const [account, setAccount] = useState<Mt5AccountInfo | null>(initialAccount);
  const [positions, setPositions] = useState<LivePosition[]>(initialPositions);
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    if (!initialAccount) return;

    let source: EventSource | null = null;
    let spinTimeout: number | null = null;

    function handleMessage(event: MessageEvent<string>) {
      try {
        const data = JSON.parse(event.data) as Mt5AccountResponse;
        setAccount(data.account);
        setPositions(data.positions);
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
  }, [initialAccount]);

  if (!account) {
    return (
      <Card className="border-dashed border-border/60">
        <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
          <Activity className="size-8 text-muted-foreground/40" />
          <div>
            <p className="text-sm font-medium text-foreground">{t("noMt5Connected")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("noMt5Hint")}</p>
          </div>
          <Link
            href="/mt5"
            className="text-xs font-medium text-primary hover:underline"
          >
            {t("connectMt5")} →
          </Link>
        </CardContent>
      </Card>
    );
  }

  const currency = account.currency ?? "";
  const totalLiveProfit = positions.reduce((s, p) => s + (p.profit ?? 0), 0);

  const stats = [
    {
      label: t("balance"),
      value: account.balance != null ? `${account.balance.toFixed(2)} ${currency}` : "—",
      icon: Wallet,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      label: t("equity"),
      value: account.equity != null ? `${account.equity.toFixed(2)} ${currency}` : "—",
      icon: TrendingUp,
      color: account.equity != null && account.balance != null && account.equity >= account.balance
        ? "text-emerald-500"
        : "text-red-500",
      bg: account.equity != null && account.balance != null && account.equity >= account.balance
        ? "bg-emerald-500/10"
        : "bg-red-500/10",
    },
    {
      label: t("margin"),
      value: account.margin != null ? `${account.margin.toFixed(2)} ${currency}` : "—",
      icon: Shield,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
    },
    {
      label: t("freeMargin"),
      value: account.freeMargin != null ? `${account.freeMargin.toFixed(2)} ${currency}` : "—",
      icon: Activity,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-base font-semibold text-foreground">
          {t("accountInfo")}
        </h2>
        <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted/25 px-2 py-1 text-xs text-muted-foreground">
          <RefreshCw className={cn("size-3.5 transition-transform", spinning && "animate-spin")} />
          {t("autoRefresh")}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="border-border/60">
            <CardContent className="flex items-center gap-3 p-4">
              <div className={cn("flex size-9 items-center justify-center rounded-lg", s.bg)}>
                <s.icon className={cn("size-4", s.color)} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-bold tabular-nums text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/60">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">
            {t("livePositions")}
            {positions.length > 0 && (
              <span className="ml-2 inline-flex size-5 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                {positions.length}
              </span>
            )}
          </CardTitle>
          {positions.length > 0 && (
            <span
              className={cn(
                "text-sm font-semibold tabular-nums",
                totalLiveProfit >= 0 ? "text-emerald-500" : "text-red-500",
              )}
            >
              {totalLiveProfit >= 0 ? "+" : ""}
              {totalLiveProfit.toFixed(2)} {currency}
            </span>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {positions.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-muted-foreground">{t("noLivePositions")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-4 py-2.5">{t("colTicket")}</th>
                    <th className="px-4 py-2.5">{t("symbol")}</th>
                    <th className="px-4 py-2.5">{t("direction")}</th>
                    <th className="px-4 py-2.5 text-right">{t("lotSize")}</th>
                    <th className="px-4 py-2.5 text-right">{t("entry")}</th>
                    <th className="px-4 py-2.5 text-right">{t("colCurrent")}</th>
                    <th className="px-4 py-2.5 text-right">SL</th>
                    <th className="px-4 py-2.5 text-right">TP</th>
                    <th className="px-4 py-2.5 text-right">{t("colProfit")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {positions.map((pos) => {
                    const isBuy = pos.type.toUpperCase().startsWith("BUY");
                    return (
                      <tr key={pos.ticket} className="transition-colors hover:bg-muted/30">
                        <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                          {pos.ticket}
                        </td>
                        <td className="px-4 py-2.5 font-mono font-medium">{pos.symbol}</td>
                        <td className="px-4 py-2.5">
                          <Badge
                            variant={isBuy ? "default" : "destructive"}
                            className="text-[11px]"
                          >
                            {isBuy ? "LONG" : "SHORT"}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs">
                          {fmt(pos.volume, 2)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs">
                          {fmt(pos.priceOpen, 5)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs font-medium text-foreground">
                          {fmt(pos.priceCurrent, 5)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground">
                          {pos.stopLoss ? fmt(pos.stopLoss, 5) : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground">
                          {pos.takeProfit ? fmt(pos.takeProfit, 5) : "—"}
                        </td>
                        <td
                          className={cn(
                            "px-4 py-2.5 text-right font-mono text-xs font-semibold",
                            (pos.profit ?? 0) >= 0 ? "text-emerald-500" : "text-red-500",
                          )}
                        >
                          {pos.profit != null
                            ? `${pos.profit >= 0 ? "+" : ""}${pos.profit.toFixed(2)}`
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {account.lastSeenAt && (
            <p className="border-t border-border/40 px-4 py-2 text-[11px] text-muted-foreground/60">
              {t("lastSync")}:{" "}
              {new Date(account.lastSeenAt).toLocaleString(locale)}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
