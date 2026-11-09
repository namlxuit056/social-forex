import { cn } from "@/lib/utils";
import { signalLevel, signalLevelDetail } from "@/components/signals/signal-level-classes";

type Level = "entry" | "sl" | "tp1" | "tp2" | "tp3";

const TARGET_COLS: Record<number, string> = { 1: "grid-cols-2", 2: "grid-cols-2", 3: "grid-cols-3" };

/** Entry / SL on the first row, the set targets on the second. Missing Entry/SL/TP1 show "—". */
export function PriceLevels({
  values,
  labels,
  size = "sm",
  className,
}: {
  values: Record<Level, number | string | null | undefined>;
  labels: Record<Level, string>;
  size?: "sm" | "lg";
  className?: string;
}) {
  const styles = size === "lg" ? signalLevelDetail : signalLevel;
  const cell = (level: Level) => {
    const value = values[level];
    const missing = value == null || value === "";
    return (
      <div key={level} data-level={level} className={cn("min-w-0", styles[level].box)}>
        <dt className={styles[level].label}>{labels[level]}</dt>
        {/* A missing level is "not set", not a red stop or green target. */}
        <dd className={cn(styles[level].value, missing && "text-muted-foreground")}>
          {missing ? "—" : value}
        </dd>
      </div>
    );
  };
  // TP1 always shows (a missing target is worth seeing); TP2/TP3 only when set.
  const targets = (["tp1", "tp2", "tp3"] as const).filter(
    (level) => level === "tp1" || (values[level] != null && values[level] !== ""),
  );
  return (
    <div className={cn("space-y-2", className)}>
      <dl className="grid grid-cols-2 gap-2 sm:gap-3">
        {cell("entry")}
        {cell("sl")}
      </dl>
      <dl className={cn("grid gap-2 sm:gap-3", TARGET_COLS[targets.length])}>
        {targets.map(cell)}
      </dl>
    </div>
  );
}
