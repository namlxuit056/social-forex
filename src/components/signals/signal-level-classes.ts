/**
 * Màu nền/viền cho Entry / SL / TP trên card & trang chi tiết (dark theme).
 */
export const signalLevel = {
  entry: {
    box: "rounded-lg border border-sky-500/45 bg-sky-500/15 px-2.5 py-2 shadow-sm ring-1 ring-inset ring-sky-400/20",
    label: "text-[0.65rem] font-semibold uppercase tracking-wide text-sky-200/95",
    value: "truncate font-mono text-sm font-semibold tabular-nums text-sky-50",
  },
  sl: {
    box: "rounded-lg border border-rose-500/45 bg-rose-500/12 px-2.5 py-2 shadow-sm ring-1 ring-inset ring-rose-400/20",
    label: "text-[0.65rem] font-semibold uppercase tracking-wide text-rose-200/95",
    value: "truncate font-mono text-sm font-semibold tabular-nums text-rose-50",
  },
  tp1: {
    box: "rounded-lg border border-emerald-500/50 bg-emerald-500/15 px-2.5 py-2 shadow-sm ring-1 ring-inset ring-emerald-400/25",
    label: "text-[0.65rem] font-semibold uppercase tracking-wide text-emerald-200/95",
    value: "truncate font-mono text-sm font-semibold tabular-nums text-emerald-50",
  },
  tp2: {
    box: "rounded-lg border border-green-500/40 bg-green-500/12 px-2.5 py-2 shadow-sm ring-1 ring-inset ring-green-400/20",
    label: "text-[0.65rem] font-semibold uppercase tracking-wide text-green-200/95",
    value: "truncate font-mono text-sm font-semibold tabular-nums text-green-50",
  },
  tp3: {
    box: "rounded-lg border border-teal-500/40 bg-teal-500/12 px-2.5 py-2 shadow-sm ring-1 ring-inset ring-teal-400/20",
    label: "text-[0.65rem] font-semibold uppercase tracking-wide text-teal-200/95",
    value: "truncate font-mono text-sm font-semibold tabular-nums text-teal-50",
  },
} as const;

/** Trang chi tiết: chữ lớn hơn */
export const signalLevelDetail = {
  entry: {
    box: "rounded-lg border border-sky-500/45 bg-sky-500/15 px-3 py-3 ring-1 ring-inset ring-sky-400/20",
    label: "text-xs font-semibold uppercase tracking-wide text-sky-200/95",
    value: "font-mono text-lg font-bold tabular-nums text-sky-50",
  },
  sl: {
    box: "rounded-lg border border-rose-500/45 bg-rose-500/12 px-3 py-3 ring-1 ring-inset ring-rose-400/20",
    label: "text-xs font-semibold uppercase tracking-wide text-rose-200/95",
    value: "font-mono text-lg font-bold tabular-nums text-rose-50",
  },
  tp1: {
    box: "rounded-lg border border-emerald-500/50 bg-emerald-500/15 px-3 py-3 ring-1 ring-inset ring-emerald-400/25",
    label: "text-xs font-semibold uppercase tracking-wide text-emerald-200/95",
    value: "font-mono text-lg font-bold tabular-nums text-emerald-50",
  },
  tp2: {
    box: "rounded-lg border border-green-500/40 bg-green-500/12 px-3 py-3 ring-1 ring-inset ring-green-400/20",
    label: "text-xs font-semibold uppercase tracking-wide text-green-200/95",
    value: "font-mono text-lg font-bold tabular-nums text-green-50",
  },
  tp3: {
    box: "rounded-lg border border-teal-500/40 bg-teal-500/12 px-3 py-3 ring-1 ring-inset ring-teal-400/20",
    label: "text-xs font-semibold uppercase tracking-wide text-teal-200/95",
    value: "font-mono text-lg font-bold tabular-nums text-teal-50",
  },
} as const;
