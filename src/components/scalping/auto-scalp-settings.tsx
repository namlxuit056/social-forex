"use client";

import { useState, useEffect, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Bot, ChevronDown, Loader2, Save, Power } from "lucide-react";
import { cn } from "@/lib/utils";
import { saveAutoScalpConfig } from "@/actions/auto-scalp-config";
import { QUOTE_DEFINITIONS } from "@/lib/quotes/definitions";
import type { AutoScalpConfigData } from "@/actions/auto-scalp-config";

type Props = {
  initial: (AutoScalpConfigData & { lastTradeAt: Date | null }) | null;
};

export function AutoScalpSettings({ initial }: Props) {
  const t = useTranslations("scalping");

  const [enabled, setEnabled] = useState(initial?.enabled ?? false);
  const [symbol, setSymbol] = useState(initial?.symbol ?? "XAUUSD");
  const [lotSize, setLotSize] = useState(String(initial?.lotSize ?? 0.01));
  const [minScore, setMinScore] = useState(String(initial?.minScore ?? 72));
  const [minConfidence, setMinConfidence] = useState(String(initial?.minConfidence ?? 3));
  const [maxPerDay, setMaxPerDay] = useState(String(initial?.maxPerDay ?? 5));
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  function handleSave() {
    setErrorMsg(null);
    setSaved(false);
    startTransition(async () => {
      const result = await saveAutoScalpConfig({
        enabled,
        symbol,
        lotSize: parseFloat(lotSize) || 0.01,
        minScore: parseInt(minScore) || 72,
        minConfidence: parseInt(minConfidence) || 3,
        maxPerDay: parseInt(maxPerDay) || 5,
      });
      if (result.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setErrorMsg(result.error ?? "error");
      }
    });
  }

  const lastTradeAt = initial?.lastTradeAt;
  const cooldownMs = lastTradeAt
    ? Math.max(0, 30 * 60 * 1000 - (now - new Date(lastTradeAt).getTime()))
    : 0;
  const cooldownMin = Math.ceil(cooldownMs / 60_000);

  return (
    <div className={cn(
      "rounded-lg border p-4 space-y-4",
      enabled ? "border-primary/30 bg-primary/5" : "border-border/60 bg-muted/10",
    )}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bot className={cn("size-4 shrink-0", enabled ? "text-primary" : "text-muted-foreground")} />
          <div>
            <p className="text-sm font-semibold text-foreground">{t("autoTitle")}</p>
            <p className="text-xs text-muted-foreground">{t("autoDesc")}</p>
          </div>
        </div>

        {/* Toggle */}
        <button
          onClick={() => setEnabled((v) => !v)}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none",
            enabled ? "bg-primary" : "bg-muted",
          )}
        >
          <span
            className={cn(
              "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform",
              enabled ? "translate-x-5" : "translate-x-0",
            )}
          />
        </button>
      </div>

      {/* Status badge */}
      {enabled && initial?.enabled && (
        <div className={cn(
          "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs",
          cooldownMin > 0
            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        )}>
          <Power className="size-3 shrink-0" />
          {cooldownMin > 0
            ? t("autoCooldown", { min: cooldownMin })
            : t("autoReady")}
          {lastTradeAt && (
            <span className="ml-auto text-muted-foreground">
              {t("autoLastTrade")}: {new Date(lastTradeAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
      )}

      {/* Config fields */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {/* Symbol */}
        <div className="col-span-2 sm:col-span-1">
          <label className="text-xs text-muted-foreground mb-1 block">{t("autoSymbol")}</label>
          <div className="relative">
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="w-full appearance-none h-8 rounded-md border border-input bg-background pl-2.5 pr-7 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {QUOTE_DEFINITIONS.map((def) => (
                <option key={def.symbol} value={def.symbol}>
                  {def.symbol}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          </div>
        </div>

        {/* Lot size */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">{t("autoLot")}</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={lotSize}
            onChange={(e) => setLotSize(e.target.value)}
            className="w-full h-8 rounded-md border border-input bg-background px-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Min score */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">{t("autoMinScore")}</label>
          <input
            type="number"
            min="50"
            max="95"
            step="1"
            value={minScore}
            onChange={(e) => setMinScore(e.target.value)}
            className="w-full h-8 rounded-md border border-input bg-background px-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Min confidence */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">{t("autoMinConf")}</label>
          <div className="relative">
            <select
              value={minConfidence}
              onChange={(e) => setMinConfidence(e.target.value)}
              className="w-full appearance-none h-8 rounded-md border border-input bg-background pl-2.5 pr-7 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {[1, 2, 3, 4, 5].map((v) => (
                <option key={v} value={v}>{"★".repeat(v)} ({v})</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          </div>
        </div>

        {/* Max per day */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">{t("autoMaxDay")}</label>
          <input
            type="number"
            min="1"
            max="20"
            step="1"
            value={maxPerDay}
            onChange={(e) => setMaxPerDay(e.target.value)}
            className="w-full h-8 rounded-md border border-input bg-background px-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      {/* Save button + feedback */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50"
        >
          {isPending ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
          {t("autoSave")}
        </button>

        {saved && (
          <span className="text-xs text-emerald-600 dark:text-emerald-400">{t("autoSaved")}</span>
        )}
        {errorMsg && (
          <span className="text-xs text-red-500">{t(`err_${errorMsg as "unauthorized" | "vip_required" | "invalid_data" | "error"}`)}</span>
        )}
      </div>

      <p className="text-xs text-muted-foreground/60">{t("autoWarning")}</p>
    </div>
  );
}
