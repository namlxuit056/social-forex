"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Bell,
  BellOff,
  Plus,
  Trash2,
  Edit3,
  Clock,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CustomFilters } from "./screener-filter-builder";

/* ── Types ── */

type ScreenerAlertLog = {
  id: string;
  alertId: string;
  symbol: string;
  triggeredAt: string;
  data: Record<string, unknown>;
};

type ScreenerAlert = {
  id: string;
  userId: string;
  name: string;
  conditions: CustomFilters;
  isActive: boolean;
  lastTriggeredAt: string | null;
  createdAt: string;
  updatedAt: string;
  logs: ScreenerAlertLog[];
};

type Props = {
  className?: string;
};

/* ── Condition summary builder ── */

function buildConditionSummary(conditions: CustomFilters): string[] {
  const parts: string[] = [];

  if (conditions.rsi) {
    const { operator, value, max } = conditions.rsi;
    if (operator === "gt") parts.push(`RSI > ${value}`);
    else if (operator === "lt") parts.push(`RSI < ${value}`);
    else if (operator === "between") parts.push(`RSI ${value}–${max}`);
  }

  if (conditions.adx) {
    const { operator, value, max } = conditions.adx;
    if (operator === "gt") parts.push(`ADX > ${value}`);
    else if (operator === "lt") parts.push(`ADX < ${value}`);
    else if (operator === "between") parts.push(`ADX ${value}–${max}`);
  }

  if (conditions.changePercent) {
    const { operator, value, max } = conditions.changePercent;
    if (operator === "gt") parts.push(`Change > ${value}%`);
    else if (operator === "lt") parts.push(`Change < ${value}%`);
    else if (operator === "between") parts.push(`Change ${value}–${max}%`);
  }

  if (conditions.emaBias?.selected.length) {
    parts.push(`EMA: ${conditions.emaBias.selected.join(", ")}`);
  }

  if (conditions.group?.selected.length) {
    parts.push(`Group: ${conditions.group.selected.join(", ")}`);
  }

  for (const tf of ["recM15", "recH1", "recH4", "recD1"] as const) {
    const sel = conditions[tf]?.selected;
    if (sel?.length) {
      const label = tf.replace("rec", "");
      parts.push(`${label}: ${sel.join(", ")}`);
    }
  }

  return parts;
}

/* ── Alert Card ── */

function AlertCard({
  alert,
  onToggle,
  onDelete,
  t,
}: {
  alert: ScreenerAlert;
  onToggle: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
  t: (key: string) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const conditions = buildConditionSummary(alert.conditions);

  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-3 transition-all",
        alert.isActive
          ? "border-green-500/20 shadow-sm shadow-green-500/5"
          : "border-muted opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {alert.isActive ? (
              <Bell className="size-3.5 text-green-500 shrink-0" />
            ) : (
              <BellOff className="size-3.5 text-muted-foreground shrink-0" />
            )}
            <span className="text-sm font-medium truncate">{alert.name}</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {conditions.map((c, i) => (
              <span
                key={i}
                className="inline-block rounded bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground"
              >
                {c}
              </span>
            ))}
            {conditions.length === 0 && (
              <span className="text-[10px] text-muted-foreground italic">
                {t("noConditions")}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onToggle(alert.id, !alert.isActive)}
            className={cn(
              "rounded p-1 transition",
              alert.isActive
                ? "text-green-500 hover:bg-green-500/10"
                : "text-muted-foreground hover:bg-muted/50",
            )}
            title={alert.isActive ? t("pause") : t("resume")}
          >
            {alert.isActive ? (
              <Bell className="size-3.5" />
            ) : (
              <BellOff className="size-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="rounded p-1 text-muted-foreground hover:bg-muted/50 transition"
          >
            {expanded ? (
              <ChevronUp className="size-3.5" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => onDelete(alert.id)}
            className="rounded p-1 text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition"
            title={t("delete")}
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      {alert.lastTriggeredAt && (
        <div className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="size-3" />
          {t("lastTriggered")}:{" "}
          {new Date(alert.lastTriggeredAt).toLocaleString()}
        </div>
      )}

      {/* Trigger logs */}
      {expanded && (
        <div className="mt-2 border-t pt-2">
          <p className="text-[10px] font-medium text-muted-foreground mb-1">
            {t("triggerHistory")} ({alert.logs.length})
          </p>
          {alert.logs.length === 0 ? (
            <p className="text-[10px] text-muted-foreground italic">
              {t("noTriggers")}
            </p>
          ) : (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {alert.logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between rounded bg-muted/30 px-2 py-1"
                >
                  <span className="text-[10px] font-mono font-medium">
                    {log.symbol}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(log.triggeredAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Create Alert Form (inline) ── */

function CreateAlertForm({
  onSubmit,
  onCancel,
  t,
}: {
  onSubmit: (name: string, conditions: CustomFilters) => void;
  onCancel: () => void;
  t: (key: string) => string;
}) {
  const [name, setName] = useState("");
  const [rsiMin, setRsiMin] = useState("");
  const [rsiMax, setRsiMax] = useState("");
  const [adxMin, setAdxMin] = useState("");
  const [emaBias, setEmaBias] = useState<string[]>([]);
  const [group, setGroup] = useState<string[]>([]);

  const EMA_OPTIONS = ["bullish", "bearish", "mixed"];
  const GROUP_OPTIONS = ["Forex", "Crypto", "Commodities", "Indices"];

  const toggleArray = (arr: string[], setArr: (v: string[]) => void, val: string) => {
    setArr(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const conditions: CustomFilters = {};
    if (rsiMin) {
      conditions.rsi = {
        operator: rsiMax ? "between" : "gt",
        value: parseFloat(rsiMin),
        max: rsiMax ? parseFloat(rsiMax) : undefined,
      };
    }
    if (adxMin) {
      conditions.adx = { operator: "gt", value: parseFloat(adxMin) };
    }
    if (emaBias.length) {
      conditions.emaBias = { selected: emaBias };
    }
    if (group.length) {
      conditions.group = { selected: group };
    }

    onSubmit(name.trim(), conditions);
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border bg-card p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">{t("createAlert")}</h4>
        <button
          type="button"
          onClick={onCancel}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {/* Name */}
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("alertNamePlaceholder")}
        className="w-full rounded border bg-background px-2 py-1.5 text-sm"
        autoFocus
        maxLength={100}
      />

      {/* RSI range */}
      <div className="space-y-1">
        <label className="text-[10px] font-medium text-muted-foreground uppercase">
          RSI
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            value={rsiMin}
            onChange={(e) => setRsiMin(e.target.value)}
            placeholder="Min"
            min={0}
            max={100}
            className="w-full rounded border bg-background px-2 py-1 text-xs"
          />
          <input
            type="number"
            value={rsiMax}
            onChange={(e) => setRsiMax(e.target.value)}
            placeholder="Max"
            min={0}
            max={100}
            className="w-full rounded border bg-background px-2 py-1 text-xs"
          />
        </div>
      </div>

      {/* ADX min */}
      <div className="space-y-1">
        <label className="text-[10px] font-medium text-muted-foreground uppercase">
          ADX {t("min")}
        </label>
        <input
          type="number"
          value={adxMin}
          onChange={(e) => setAdxMin(e.target.value)}
          placeholder="e.g. 25"
          min={0}
          max={100}
          className="w-full rounded border bg-background px-2 py-1 text-xs"
        />
      </div>

      {/* EMA Bias */}
      <div className="space-y-1">
        <label className="text-[10px] font-medium text-muted-foreground uppercase">
          EMA Bias
        </label>
        <div className="flex flex-wrap gap-1">
          {EMA_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => toggleArray(emaBias, setEmaBias, opt)}
              className={cn(
                "rounded px-2 py-0.5 text-[10px] font-medium border transition",
                emaBias.includes(opt)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-muted bg-muted/30 text-muted-foreground hover:text-foreground",
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Group */}
      <div className="space-y-1">
        <label className="text-[10px] font-medium text-muted-foreground uppercase">
          {t("group")}
        </label>
        <div className="flex flex-wrap gap-1">
          {GROUP_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => toggleArray(group, setGroup, opt)}
              className={cn(
                "rounded px-2 py-0.5 text-[10px] font-medium border transition",
                group.includes(opt)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-muted bg-muted/30 text-muted-foreground hover:text-foreground",
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition"
        >
          {t("cancel")}
        </button>
        <button
          type="submit"
          disabled={!name.trim()}
          className="flex items-center gap-1 rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-40 transition"
        >
          <Check className="size-3" />
          {t("create")}
        </button>
      </div>
    </form>
  );
}

/* ── Main Component ── */

export function ScreenerAlerts({ className }: Props) {
  const t = useTranslations("screener.alerts");
  const [alerts, setAlerts] = useState<ScreenerAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch("/api/screener/alerts");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setAlerts(data);
    } catch {
      setError(t("fetchError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleCreate = async (name: string, conditions: CustomFilters) => {
    try {
      const res = await fetch("/api/screener/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, conditions }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (data.error === "max_alerts_reached") {
          setError(t("maxAlertsReached"));
        } else {
          setError(t("createError"));
        }
        return;
      }

      setShowCreate(false);
      await fetchAlerts();
    } catch {
      setError(t("createError"));
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch("/api/screener/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive }),
      });

      if (!res.ok) throw new Error("Failed to toggle");

      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, isActive } : a)),
      );
    } catch {
      setError(t("updateError"));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/screener/alerts?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete");

      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch {
      setError(t("deleteError"));
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="size-4 text-primary" />
          <h3 className="text-sm font-semibold">{t("title")}</h3>
          {alerts.length > 0 && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {alerts.filter((a) => a.isActive).length}/{alerts.length}
            </span>
          )}
        </div>
        {!showCreate && (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1 rounded bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary hover:bg-primary/20 transition"
          >
            <Plus className="size-3" />
            {t("newAlert")}
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertTriangle className="size-3.5 shrink-0" />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-auto"
          >
            <X className="size-3" />
          </button>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <CreateAlertForm
          onSubmit={handleCreate}
          onCancel={() => setShowCreate(false)}
          t={t}
        />
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-4">
          <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {/* Alert list */}
      {!loading && alerts.length === 0 && !showCreate && (
        <div className="rounded-lg border border-dashed py-6 text-center">
          <BellOff className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-2 text-xs text-muted-foreground">
            {t("noAlerts")}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {t("noAlertsHint")}
          </p>
        </div>
      )}

      {!loading && alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onToggle={handleToggle}
              onDelete={handleDelete}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
}
