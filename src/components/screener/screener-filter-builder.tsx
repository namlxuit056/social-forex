"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  SlidersHorizontal,
  Save,
  Trash2,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Types ── */

type Operator = "gt" | "lt" | "between";

type RangeCondition = {
  operator: Operator;
  value: number;
  max?: number; // only for "between"
};

type MultiSelectCondition = {
  selected: string[];
};

export type CustomFilters = {
  rsi?: RangeCondition;
  adx?: RangeCondition;
  emaBias?: MultiSelectCondition;
  recM15?: MultiSelectCondition;
  recH1?: MultiSelectCondition;
  recH4?: MultiSelectCondition;
  recD1?: MultiSelectCondition;
  changePercent?: RangeCondition;
  group?: MultiSelectCondition;
};

type FilterPreset = {
  id: string;
  name: string;
  filters: CustomFilters;
  createdAt: number;
};

type Props = {
  totalPairs: number;
  matchedPairs: number;
  onApply: (filters: CustomFilters) => void;
  activeFilters: CustomFilters;
};

/* ── Constants ── */

const LS_PRESETS_KEY = "screener_custom_filter_presets";

const EMA_BIAS_OPTIONS = ["bullish", "bearish", "mixed"] as const;

const REC_OPTIONS = [
  { value: 0.5, label: "Strong Buy" },
  { value: 0.1, label: "Buy" },
  { value: 0, label: "Neutral" },
  { value: -0.5, label: "Sell" },
  { value: -1, label: "Strong Sell" },
] as const;

const GROUP_OPTIONS = ["Forex", "Crypto", "Commodities", "Indices"] as const;

const OPERATOR_LABELS: Record<Operator, string> = {
  gt: ">",
  lt: "<",
  between: "↔",
};

/* ── Sub-components ── */

function RangeFilter({
  label,
  condition,
  onChange,
  min = 0,
  max = 100,
  step = 1,
}: {
  label: string;
  condition?: RangeCondition;
  onChange: (c: RangeCondition | undefined) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const active = !!condition;

  const cycleOperator = useCallback(() => {
    if (!condition) {
      onChange({ operator: "gt", value: min + (max - min) * 0.5 });
      return;
    }
    const next: Record<Operator, Operator> = {
      gt: "lt",
      lt: "between",
      between: "gt",
    };
    onChange({
      ...condition,
      operator: next[condition.operator],
      max: next[condition.operator] === "between" ? condition.value + 20 : undefined,
    });
  }, [condition, onChange, min, max]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={cycleOperator}
          className={cn(
            "rounded px-2 py-1 text-xs font-mono font-bold transition",
            active
              ? "bg-primary/15 text-primary"
              : "bg-muted/40 text-muted-foreground hover:text-foreground",
          )}
        >
          {active ? OPERATOR_LABELS[condition.operator] : "—"}
        </button>
        <span className="text-xs font-medium text-foreground">{label}</span>
        {active && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="ml-auto text-muted-foreground hover:text-destructive transition"
          >
            <X className="size-3" />
          </button>
        )}
      </div>
      {active && condition && (
        <div className="flex items-center gap-2 pl-1">
          {condition.operator === "between" ? (
            <>
              <input
                type="number"
                value={condition.value}
                min={min}
                max={max}
                step={step}
                onChange={(e) =>
                  onChange({ ...condition, value: Number(e.target.value) })
                }
                className="w-20 rounded border border-border bg-background px-2 py-1 text-xs font-mono"
              />
              <span className="text-xs text-muted-foreground">—</span>
              <input
                type="number"
                value={condition.max ?? condition.value + 20}
                min={min}
                max={max}
                step={step}
                onChange={(e) =>
                  onChange({ ...condition, max: Number(e.target.value) })
                }
                className="w-20 rounded border border-border bg-background px-2 py-1 text-xs font-mono"
              />
            </>
          ) : (
            <input
              type="number"
              value={condition.value}
              min={min}
              max={max}
              step={step}
              onChange={(e) =>
                onChange({ ...condition, value: Number(e.target.value) })
              }
              className="w-20 rounded border border-border bg-background px-2 py-1 text-xs font-mono"
            />
          )}
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={condition.operator === "between" ? condition.value : condition.value}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (condition.operator === "between") {
                onChange({ ...condition, value: Math.min(v, (condition.max ?? max) - 1) });
              } else {
                onChange({ ...condition, value: v });
              }
            }}
            className="flex-1 accent-primary"
          />
        </div>
      )}
    </div>
  );
}

function MultiSelectFilter({
  label,
  options,
  condition,
  onChange,
  optionLabels,
}: {
  label: string;
  options: readonly string[];
  condition?: MultiSelectCondition;
  onChange: (c: MultiSelectCondition | undefined) => void;
  optionLabels?: Record<string, string>;
}) {
  const selected = condition?.selected ?? [];
  const active = selected.length > 0;

  const toggle = useCallback(
    (val: string) => {
      const next = selected.includes(val)
        ? selected.filter((s) => s !== val)
        : [...selected, val];
      onChange(next.length > 0 ? { selected: next } : undefined);
    },
    [selected, onChange],
  );

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "text-xs font-medium",
            active ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {label}
        </span>
        {active && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="ml-auto text-muted-foreground hover:text-destructive transition"
          >
            <X className="size-3" />
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => {
          const isSelected = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={cn(
                "rounded px-2 py-0.5 text-[10px] font-medium transition",
                isSelected
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "bg-muted/30 text-muted-foreground hover:text-foreground border border-transparent",
              )}
            >
              {optionLabels?.[opt] ?? opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RecFilter({
  label,
  tf,
  condition,
  onChange,
}: {
  label: string;
  tf: string;
  condition?: MultiSelectCondition;
  onChange: (c: MultiSelectCondition | undefined) => void;
}) {
  return (
    <MultiSelectFilter
      label={label}
      options={REC_OPTIONS.map((r) => String(r.value))}
      condition={condition}
      onChange={onChange}
      optionLabels={Object.fromEntries(
        REC_OPTIONS.map((r) => [String(r.value), r.label]),
      )}
    />
  );
}

/* ── Main Component ── */

export function ScreenerFilterBuilder({
  totalPairs,
  matchedPairs,
  onApply,
  activeFilters,
}: Props) {
  const t = useTranslations("screener");

  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState<CustomFilters>({});
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [presetName, setPresetName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);

  // Load presets from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_PRESETS_KEY);
      if (stored) setPresets(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  // Sync draft from active filters
  useEffect(() => {
    setDraft(activeFilters);
  }, [activeFilters]);

  const savePresets = useCallback((next: FilterPreset[]) => {
    setPresets(next);
    try {
      localStorage.setItem(LS_PRESETS_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  const hasActiveFilters = useMemo(() => {
    return Object.values(activeFilters).some((v) => v !== undefined);
  }, [activeFilters]);

  const handleApply = useCallback(() => {
    onApply(draft);
  }, [draft, onApply]);

  const handleClear = useCallback(() => {
    setDraft({});
    onApply({});
  }, [onApply]);

  const handleSavePreset = useCallback(() => {
    if (!presetName.trim()) return;
    const preset: FilterPreset = {
      id: Date.now().toString(36),
      name: presetName.trim(),
      filters: { ...draft },
      createdAt: Date.now(),
    };
    savePresets([...presets, preset]);
    setPresetName("");
    setShowSaveInput(false);
  }, [presetName, draft, presets, savePresets]);

  const handleLoadPreset = useCallback(
    (preset: FilterPreset) => {
      setDraft(preset.filters);
      onApply(preset.filters);
    },
    [onApply],
  );

  const handleDeletePreset = useCallback(
    (id: string) => {
      savePresets(presets.filter((p) => p.id !== id));
    },
    [presets, savePresets],
  );

  const updateDraft = useCallback(
    <K extends keyof CustomFilters>(key: K, value: CustomFilters[K]) => {
      setDraft((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  return (
    <div className="rounded-lg border border-border bg-muted/10">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition"
        >
          <SlidersHorizontal className="size-4" />
          {t("customFilter")}
          {hasActiveFilters && (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
              {matchedPairs}/{totalPairs}
            </span>
          )}
          {expanded ? (
            <ChevronUp className="size-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-3.5 text-muted-foreground" />
          )}
        </button>

        {/* Presets dropdown */}
        {presets.length > 0 && (
          <div className="flex items-center gap-1">
            {presets.map((p) => (
              <div key={p.id} className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => handleLoadPreset(p)}
                  className="rounded bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground transition"
                  title={p.name}
                >
                  {p.name}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeletePreset(p.id)}
                  className="text-muted-foreground hover:text-destructive transition"
                >
                  <X className="size-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="border-t border-border px-4 py-3 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* RSI */}
            <RangeFilter
              label={t("rsiRange")}
              condition={draft.rsi}
              onChange={(c) => updateDraft("rsi", c)}
              min={0}
              max={100}
            />

            {/* ADX */}
            <RangeFilter
              label={t("adxThreshold")}
              condition={draft.adx}
              onChange={(c) => updateDraft("adx", c)}
              min={0}
              max={100}
            />

            {/* Change% */}
            <RangeFilter
              label={t("changeRange")}
              condition={draft.changePercent}
              onChange={(c) => updateDraft("changePercent", c)}
              min={-20}
              max={20}
              step={0.1}
            />

            {/* EMA Bias */}
            <MultiSelectFilter
              label={t("emaBias")}
              options={EMA_BIAS_OPTIONS}
              condition={draft.emaBias}
              onChange={(c) => updateDraft("emaBias", c)}
            />

            {/* Group */}
            <MultiSelectFilter
              label={t("group")}
              options={GROUP_OPTIONS}
              condition={draft.group}
              onChange={(c) => updateDraft("group", c)}
            />
          </div>

          {/* Recommendations per TF */}
          <div className="border-t border-border pt-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("recommendation")}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <RecFilter
                label="M15"
                tf="M15"
                condition={draft.recM15}
                onChange={(c) => updateDraft("recM15", c)}
              />
              <RecFilter
                label="H1"
                tf="H1"
                condition={draft.recH1}
                onChange={(c) => updateDraft("recH1", c)}
              />
              <RecFilter
                label="H4"
                tf="H4"
                condition={draft.recH4}
                onChange={(c) => updateDraft("recH4", c)}
              />
              <RecFilter
                label="D1"
                tf="D1"
                condition={draft.recD1}
                onChange={(c) => updateDraft("recD1", c)}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 border-t border-border pt-3">
            <button
              type="button"
              onClick={handleApply}
              className="rounded-md bg-primary/15 px-4 py-1.5 text-xs font-semibold text-primary hover:bg-primary/25 transition"
            >
              {t("applyFilters")}
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="rounded-md bg-muted/40 px-4 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition"
            >
              {t("clearFilters")}
            </button>

            <div className="ml-auto flex items-center gap-2">
              {showSaveInput ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSavePreset()}
                    placeholder={t("presetNamePlaceholder")}
                    className="w-32 rounded border border-border bg-background px-2 py-1 text-xs"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleSavePreset}
                    disabled={!presetName.trim()}
                    className="rounded bg-primary/15 px-2 py-1 text-[10px] font-semibold text-primary disabled:opacity-40"
                  >
                    <Save className="size-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSaveInput(false);
                      setPresetName("");
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowSaveInput(true)}
                  className="flex items-center gap-1 rounded bg-muted/40 px-2 py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground transition"
                >
                  <Save className="size-3" />
                  {t("savePreset")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
