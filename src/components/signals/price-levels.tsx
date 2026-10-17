import { cn } from "@/lib/utils";
import { signalLevel, signalLevelDetail } from "@/components/signals/signal-level-classes";

type Level = "entry" | "sl" | "tp1" | "tp2" | "tp3";

/** Entry / SL on the first row, TP1–3 on the second. Missing levels show "—". */
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
  return (
    <div className={cn("space-y-2", className)}>
      <dl className="grid grid-cols-2 gap-2 sm:gap-3">
        {cell("entry")}
        {cell("sl")}
      </dl>
      <dl className="grid grid-cols-3 gap-2 sm:gap-3">
        {cell("tp1")}
        {cell("tp2")}
        {cell("tp3")}
      </dl>
    </div>
  );
}
