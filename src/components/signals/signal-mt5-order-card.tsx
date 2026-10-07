"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Loader2, MonitorSmartphone } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { placeOrder, type EdgeWarning } from "@/actions/mt5-commands";
import { logGuardOverride } from "@/actions/guard-override";
import { estimateOrderRisk } from "@/lib/calculators";
import {
  marketOrderTypeForSignal,
  pendingOrderTypeForSignal,
} from "@/lib/signals/signal-order-type";
import type { QuotesApiResponse } from "@/lib/quotes/types";
import { cn } from "@/lib/utils";

const QUOTE_REFRESH_MS = 20_000;
const RISK_PRESETS = [0.5, 1, 2] as const;

type Mode = "pending" | "market";

type Warnings = {
  plan?: { symbol: string; hasPlan: boolean };
  dailyLimit?: { ordersPlacedToday: number; maxTrades: number };
  dailyRisk?: { projectedPct: number; maxRiskPercent: number };
  edge?: EdgeWarning;
};

function fmtUsd(v: number) {
  return `$${Math.abs(v).toFixed(2)}`;
}

/**
 * Vào lệnh MT5 thẳng từ trang chi tiết tín hiệu: nhập lot → queue lệnh qua EA bridge
 * (cùng action `placeOrder` + luồng cảnh báo "vẫn đặt lệnh" như /positions).
 */
export function SignalMt5OrderCard({
  symbol,
  direction,
  entry,
  stopLoss,
  takeProfit,
  connected,
  balance,
}: {
  symbol: string;
  direction: string;
  entry: number;
  stopLoss: number | null;
  takeProfit: number | null;
  connected: boolean;
  balance: number | null;
}) {
  const t = useTranslations("signals");
  const [mode, setMode] = useState<Mode>("pending");
  const [volume, setVolume] = useState("0.01");
  const [quote, setQuote] = useState<{ bid: number; ask: number } | null>(null);
  const [warnings, setWarnings] = useState<Warnings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!connected) return;
    let cancelled = false;
    const load = () =>
      fetch("/api/quotes")
        .then((res) => res.json() as Promise<QuotesApiResponse>)
        .then((data) => {
          if (cancelled) return;
          const q = data.quotes.find((x) => x.symbol === symbol);
          setQuote(q ? { bid: q.bid, ask: q.ask } : null);
        })
        .catch(() => {});
    void load();
    const id = setInterval(load, QUOTE_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [connected, symbol]);

  const isBuy = direction === "LONG";
  const pendingType = pendingOrderTypeForSignal(direction, entry, quote);
  const marketType = marketOrderTypeForSignal(direction);
  // Entry trùng giá thị trường → không có lệnh chờ hợp lệ, dùng lệnh thị trường.
  const effectiveMode: Mode = mode === "pending" && quote && !pendingType ? "market" : mode;
  const orderType = effectiveMode === "pending" ? pendingType : marketType;
  const marketPrice = quote ? (isBuy ? quote.ask : quote.bid) : null;
  const refPrice = effectiveMode === "pending" ? entry : marketPrice;
  const lots = Number(volume);

  const risk = useMemo(
    () =>
      estimateOrderRisk({
        symbol,
        isBuy,
        entryPrice: refPrice,
        volume: lots > 0 ? lots : null,
        stopLoss,
        takeProfit,
      }),
    [symbol, isBuy, refPrice, lots, stopLoss, takeProfit],
  );

  // Rủi ro $ cho 1 lot — dùng để quy đổi % vốn → lot.
  const riskPerLot = useMemo(
    () =>
      estimateOrderRisk({ symbol, isBuy, entryPrice: refPrice, volume: 1, stopLoss, takeProfit: null })
        .slAmount,
    [symbol, isBuy, refPrice, stopLoss],
  );

  function applyRiskPreset(pct: number) {
    if (!balance || !riskPerLot || riskPerLot <= 0) return;
    const raw = (balance * pct) / 100 / riskPerLot;
    const rounded = Math.max(0.01, Math.floor(raw * 100) / 100);
    setVolume(rounded.toFixed(2));
    setWarnings(null);
  }

  function submit(confirmed: boolean) {
    setError(null);
    setDone(false);
    if (!orderType) {
      setError(t("mt5OrderErrorNoQuote"));
      return;
    }
    if (!(lots > 0)) {
      setError(t("mt5OrderErrorLot"));
      return;
    }
    if (confirmed && warnings?.edge) void logGuardOverride("weakEdge", "mt5");
    if (!confirmed) setWarnings(null);
    startTransition(async () => {
      const result = await placeOrder({
        symbol,
        orderType,
        volume: lots,
        price: effectiveMode === "pending" ? entry : null,
        stopLoss,
        takeProfit,
        confirmedOverLimit: confirmed,
        confirmedNoPlan: confirmed,
        confirmedOverRisk: confirmed,
        confirmedWeakEdge: confirmed,
      });
      if (result.planWarning || result.dailyLimitWarning || result.dailyRiskWarning || result.edgeWarning) {
        setWarnings({
          plan: result.planWarning,
          dailyLimit: result.dailyLimitWarning,
          dailyRisk: result.dailyRiskWarning,
          edge: result.edgeWarning,
        });
        return;
      }
      if (result.error) {
        setError(
          result.error === "no_connection"
            ? t("mt5OrderErrorNoConnection")
            : result.error === "invalid_params"
              ? t("mt5OrderErrorLot")
              : t("mt5OrderErrorGeneric"),
        );
        return;
      }
      setWarnings(null);
      setDone(true);
    });
  }

  if (!connected) {
    return (
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-border/60 bg-muted/10 p-4">
        <div className="flex items-start gap-3">
          <MonitorSmartphone className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
          <div>
            <h2 className="text-sm font-medium text-foreground">{t("mt5OrderTitle")}</h2>
            <p className="text-xs text-muted-foreground">{t("mt5OrderConnectHint")}</p>
          </div>
        </div>
        <Link href="/mt5" className="text-sm font-medium text-primary hover:underline">
          {t("mt5OrderConnectCta")}
        </Link>
      </section>
    );
  }

  const hasWarnings = !!warnings && Object.values(warnings).some(Boolean);
  const typeLabel = orderType ? orderType.replace("_", " ") : "—";

  return (
    <section
      className="space-y-4 rounded-lg border border-primary/30 bg-primary/5 p-4"
      aria-labelledby="signal-mt5-order-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="signal-mt5-order-heading" className="text-sm font-medium text-foreground">
          {t("mt5OrderTitle")}
        </h2>
        <span className="font-mono text-xs text-muted-foreground">
          {quote ? t("mt5OrderLivePrice", { bid: quote.bid, ask: quote.ask }) : t("mt5OrderLoadingPrice")}
        </span>
      </div>

      <div className="flex rounded-md border border-border/60 bg-background p-0.5 text-xs">
        {(["pending", "market"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setWarnings(null);
            }}
            aria-pressed={effectiveMode === m}
            className={cn(
              "flex-1 rounded-sm px-2.5 py-1.5 font-medium transition-colors",
              effectiveMode === m ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {m === "pending" ? t("mt5OrderModePending", { entry }) : t("mt5OrderModeMarket")}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,10rem)_1fr] sm:items-end">
        <div className="grid gap-1.5">
          <Label htmlFor="signal-mt5-lot">{t("mt5OrderLot")}</Label>
          <Input
            id="signal-mt5-lot"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            value={volume}
            onChange={(e) => {
              setVolume(e.target.value);
              setWarnings(null);
            }}
          />
        </div>
        {balance && riskPerLot && riskPerLot > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">{t("mt5OrderRiskPreset")}</span>
            {RISK_PRESETS.map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => applyRiskPreset(pct)}
                className="rounded-md border border-border/60 bg-background px-2 py-1 font-mono text-xs text-foreground transition-colors hover:border-primary"
              >
                {pct}%
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <div>
          <dt className="text-muted-foreground">{t("mt5OrderType")}</dt>
          <dd className="font-mono font-medium text-foreground">{typeLabel}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">SL / TP</dt>
          <dd className="font-mono font-medium text-foreground">
            {stopLoss ?? "—"} / {takeProfit ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("mt5OrderRiskIfSl")}</dt>
          <dd className="font-mono font-medium text-red-500">
            {risk.slAmount != null && risk.slAmount > 0
              ? `-${fmtUsd(risk.slAmount)}${balance ? ` (${((risk.slAmount / balance) * 100).toFixed(1)}%)` : ""}`
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("mt5OrderRewardIfTp")}</dt>
          <dd className="font-mono font-medium text-emerald-500">
            {risk.tpAmount != null && risk.tpAmount > 0 ? `+${fmtUsd(risk.tpAmount)}` : "—"}
          </dd>
        </div>
      </dl>

      {stopLoss == null && <p className="text-xs text-amber-600 dark:text-amber-500">{t("mt5OrderNoSl")}</p>}

      {hasWarnings && (
        <div className="space-y-1 text-sm text-amber-600 dark:text-amber-400">
          {warnings?.plan && (
            <p>
              {warnings.plan.hasPlan
                ? t("mt5OrderWarnUnplanned", { symbol: warnings.plan.symbol })
                : t("mt5OrderWarnNoPlan")}
            </p>
          )}
          {warnings?.dailyLimit && (
            <p>
              {t("mt5OrderWarnDailyLimit", {
                placed: warnings.dailyLimit.ordersPlacedToday,
                max: warnings.dailyLimit.maxTrades,
              })}
            </p>
          )}
          {warnings?.dailyRisk && (
            <p>
              {t("mt5OrderWarnDailyRisk", {
                pct: warnings.dailyRisk.projectedPct,
                max: warnings.dailyRisk.maxRiskPercent,
              })}
            </p>
          )}
          {warnings?.edge && (
            <p>
              {t("mt5OrderWarnEdge", {
                rate: warnings.edge.winRate,
                total: warnings.edge.total,
                baseline: warnings.edge.baselineWinRate,
              })}
            </p>
          )}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
      {done && (
        <p className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-500">
          <CheckCircle2 className="size-4" aria-hidden />
          {t("mt5OrderQueued")}{" "}
          <Link href="/positions" className="font-medium underline">
            {t("mt5OrderViewPositions")}
          </Link>
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={() => submit(hasWarnings)}
          disabled={isPending || !orderType}
          variant={hasWarnings ? "outline" : "default"}
          className={cn(
            !hasWarnings &&
              (isBuy
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-red-600 text-white hover:bg-red-700"),
          )}
        >
          {isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {hasWarnings
            ? t("mt5OrderPlaceAnyway")
            : t("mt5OrderSubmit", { side: isBuy ? "BUY" : "SELL", lots: lots > 0 ? lots : 0 })}
        </Button>
        <p className="text-xs text-muted-foreground">{t("mt5OrderHint")}</p>
      </div>
    </section>
  );
}
