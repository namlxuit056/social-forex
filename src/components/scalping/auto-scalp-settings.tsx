"use client";

import { useState, useEffect, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Bot, ChevronDown, Loader2, Save, Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  saveAutoScalpConfig,
  addAutoScalpSymbol,
  removeAutoScalpSymbol,
  toggleAutoScalpSymbol,
} from "@/actions/auto-scalp-config";
import { QUOTE_DEFINITIONS } from "@/lib/quotes/definitions";
import type { AutoScalpFullConfig, AutoScalpSymbolRow } from "@/actions/auto-scalp-config";

const COOLDOWN_MS = 30 * 60 * 1000;

type Props = {
  initial: AutoScalpFullConfig | null;
  isVip: boolean;
};

function SymbolCard({
  sym,
  now,
  onRemove,
  onToggle,
}: {
  sym: AutoScalpSymbolRow;
  now: number;
  onRemove: (id: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
}) {
  const t = useTranslations("scalping");
  const lastAt = sym.lastTradeAt ? new Date(sym.lastTradeAt).getTime() : null;
  const cooldownMs = lastAt ? Math.max(0, COOLDOWN_MS - (now - lastAt)) : 0;
  const cooldownMin = Math.ceil(cooldownMs / 60_000);

  return (
    <div className={cn(
      "flex items-center justify-between gap-3 rounded-lg border px-3 py-2",
      sym.enabled ? "border-primary/20 bg-primary/5" : "border-border/60 opacity-60",
    )}>
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs font-mono font-semibold">{sym.symbol}</span>
        <span className="text-xs text-muted-foreground">lot {sym.lotSize}</span>
        {sym.enabled && (
          <span className={cn("text-[10px] rounded px-1.5 py-0.5", cooldownMin > 0 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400")}>
            {cooldownMin > 0 ? t("autoCooldown", { min: cooldownMin }) : t("autoReady")}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onToggle(sym.id, !sym.enabled)}
          className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
          title={sym.enabled ? t("disable") : t("enable")}
        >
          {sym.enabled ? <ToggleRight className="size-4 text-primary" /> : <ToggleLeft className="size-4" />}
        </button>
        <button
          onClick={() => onRemove(sym.id)}
          className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
          title={t("remove")}
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

export function AutoScalpSettings({ initial, isVip }: Props) {
  const t = useTranslations("scalping");

  const [enabled, setEnabled] = useState(initial?.enabled ?? false);
  const [minScore, setMinScore] = useState(String(initial?.minScore ?? 72));
  const [minConfidence, setMinConfidence] = useState(String(initial?.minConfidence ?? 3));
  const [maxPerDay, setMaxPerDay] = useState(String(initial?.maxPerDay ?? 5));
  const [symbols, setSymbols] = useState<AutoScalpSymbolRow[]>(initial?.symbols ?? []);
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [now, setNow] = useState(() => Date.now());

  // Add symbol fields
  const [addSymbol, setAddSymbol] = useState("XAUUSD");
  const [addLot, setAddLot] = useState("0.01");
  const [addPending, startAddTransition] = useTransition();
  const [addError, setAddError] = useState<string | null>(null);

  const symbolLimit = isVip ? 10 : 3;

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
        minScore: parseInt(minScore, 10) || 72,
        minConfidence: parseInt(minConfidence, 10) || 3,
        maxPerDay: parseInt(maxPerDay, 10) || 5,
      });
      if (result.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setErrorMsg(result.error ?? "error");
      }
    });
  }

  function handleAdd() {
    setAddError(null);
    startAddTransition(async () => {
      const lot = parseFloat(addLot) || 0.01;
      const result = await addAutoScalpSymbol(addSymbol, lot);
      if (result.ok) {
        setSymbols((prev) => [
          ...prev,
          { id: `tmp-${Date.now()}`, symbol: addSymbol, enabled: true, lotSize: lot, lastTradeAt: null },
        ]);
        // Re-fetch to get real ID — page will revalidate, but for optimistic we keep the tmp
      } else {
        setAddError(result.error ?? "error");
      }
    });
  }

  function handleRemove(symbolId: string) {
    startTransition(async () => {
      const result = await removeAutoScalpSymbol(symbolId);
      if (result.ok) {
        setSymbols((prev) => prev.filter((s) => s.id !== symbolId));
      }
    });
  }

  function handleToggle(symbolId: string, enabledVal: boolean) {
    startTransition(async () => {
      const result = await toggleAutoScalpSymbol(symbolId, enabledVal);
      if (result.ok) {
        setSymbols((prev) => prev.map((s) => s.id === symbolId ? { ...s, enabled: enabledVal } : s));
      }
    });
  }

  const addedSymbols = new Set(symbols.map((s) => s.symbol));
  const availableToAdd = QUOTE_DEFINITIONS.filter((d) => !addedSymbols.has(d.symbol));

  return (
    <div className={cn(
      "rounded-lg border p-4 space-y-4",
      enabled ? "border-primary/30 bg-primary/5" : "border-border/60 bg-muted/10",
    )}>
      {/* Header + master toggle */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bot className={cn("size-4 shrink-0", enabled ? "text-primary" : "text-muted-foreground")} />
          <div>
            <p className="text-sm font-semibold text-foreground">{t("autoTitle")}</p>
            <p className="text-xs text-muted-foreground">{t("autoDesc")}</p>
          </div>
        </div>
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

      {/* Global settings */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">{t("autoMinScore")}</label>
          <input
            type="number" min="50" max="95" step="1" value={minScore}
            onChange={(e) => setMinScore(e.target.value)}
            className="w-full h-8 rounded-md border border-input bg-background px-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
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
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">{t("autoMaxDay")}</label>
          <input
            type="number" min="1" max="20" step="1" value={maxPerDay}
            onChange={(e) => setMaxPerDay(e.target.value)}
            className="w-full h-8 rounded-md border border-input bg-background px-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      {/* Save global + feedback */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50"
        >
          {isPending ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
          {t("autoSave")}
        </button>
        {saved && <span className="text-xs text-emerald-600 dark:text-emerald-400">{t("autoSaved")}</span>}
        {errorMsg && (
          <span className="text-xs text-red-500">
            {errorMsg.startsWith("invalid_data:") ? errorMsg : t(`err_${errorMsg as "unauthorized" | "vip_required" | "invalid_data" | "error"}`)}
          </span>
        )}
      </div>

      {/* Symbol list */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("autoSymbols")}</p>
          <span className="text-xs text-muted-foreground">{symbols.length}/{symbolLimit}</span>
        </div>

        {symbols.length === 0 && (
          <p className="text-xs text-muted-foreground py-2">{t("autoNoSymbols")}</p>
        )}

        {symbols.map((sym) => (
          <SymbolCard key={sym.id} sym={sym} now={now} onRemove={handleRemove} onToggle={handleToggle} />
        ))}

        {/* Add symbol row */}
        {symbols.length < symbolLimit && availableToAdd.length > 0 && (
          <div className="flex items-end gap-2 pt-1">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">{t("autoSymbol")}</label>
              <div className="relative">
                <select
                  value={addSymbol}
                  onChange={(e) => setAddSymbol(e.target.value)}
                  className="w-full appearance-none h-8 rounded-md border border-input bg-background pl-2.5 pr-7 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {availableToAdd.map((d) => (
                    <option key={d.symbol} value={d.symbol}>{d.symbol}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              </div>
            </div>
            <div className="w-20">
              <label className="text-xs text-muted-foreground mb-1 block">{t("autoLot")}</label>
              <input
                type="number" min="0.01" step="0.01" value={addLot}
                onChange={(e) => setAddLot(e.target.value)}
                className="w-full h-8 rounded-md border border-input bg-background px-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <button
              onClick={handleAdd}
              disabled={addPending}
              className="flex items-center gap-1 h-8 rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50 shrink-0"
            >
              {addPending ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
              {t("autoAddSymbol")}
            </button>
          </div>
        )}

        {addError && (
          <p className="text-xs text-destructive">{addError === "limit_reached" ? t("autoLimitReached", { limit: symbolLimit }) : addError}</p>
        )}
      </div>

      <p className="text-xs text-muted-foreground/60">{t("autoWarning")}</p>
    </div>
  );
}
