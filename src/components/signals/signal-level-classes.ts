// Levels sit on a neutral surface; only the value carries meaning colour
// (stop = red, targets = green) so five boxes don't compete with the pair.
export const signalLevel = {
  entry: {
    box: "rounded-lg bg-muted px-2.5 py-2",
    label: "text-xs font-medium text-muted-foreground",
    value: "truncate font-mono text-sm font-semibold tabular-nums text-foreground",
  },
  sl: {
    box: "rounded-lg bg-muted px-2.5 py-2",
    label: "text-xs font-medium text-muted-foreground",
    value: "truncate font-mono text-sm font-semibold tabular-nums text-rose-700 dark:text-rose-300",
  },
  tp1: {
    box: "rounded-lg bg-muted px-2.5 py-2",
    label: "text-xs font-medium text-muted-foreground",
    value: "truncate font-mono text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-300",
  },
  tp2: {
    box: "rounded-lg bg-muted px-2.5 py-2",
    label: "text-xs font-medium text-muted-foreground",
    value: "truncate font-mono text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-300",
  },
  tp3: {
    box: "rounded-lg bg-muted px-2.5 py-2",
    label: "text-xs font-medium text-muted-foreground",
    value: "truncate font-mono text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-300",
  },
} as const;

/** Trang chi tiết: chữ lớn hơn */
export const signalLevelDetail = {
  entry: {
    box: "rounded-lg bg-muted px-3 py-3",
    label: "text-xs font-medium text-muted-foreground",
    value: "font-mono text-lg font-bold tabular-nums text-foreground",
  },
  sl: {
    box: "rounded-lg bg-muted px-3 py-3",
    label: "text-xs font-medium text-muted-foreground",
    value: "font-mono text-lg font-bold tabular-nums text-rose-700 dark:text-rose-300",
  },
  tp1: {
    box: "rounded-lg bg-muted px-3 py-3",
    label: "text-xs font-medium text-muted-foreground",
    value: "font-mono text-lg font-bold tabular-nums text-emerald-700 dark:text-emerald-300",
  },
  tp2: {
    box: "rounded-lg bg-muted px-3 py-3",
    label: "text-xs font-medium text-muted-foreground",
    value: "font-mono text-lg font-bold tabular-nums text-emerald-700 dark:text-emerald-300",
  },
  tp3: {
    box: "rounded-lg bg-muted px-3 py-3",
    label: "text-xs font-medium text-muted-foreground",
    value: "font-mono text-lg font-bold tabular-nums text-emerald-700 dark:text-emerald-300",
  },
} as const;
