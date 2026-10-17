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
  const cell = (level: Level) => (
    <div key={level} data-level={level} className={cn("min-w-0", styles[level].box)}>
      <div className={styles[level].label}>{labels[level]}</div>
      <div className={styles[level].value}>{values[level] ?? "—"}</div>
    </div>
  );
  return (
    <div className={cn("space-y-2", className)}>
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {cell("entry")}
        {cell("sl")}
      </div>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {cell("tp1")}
        {cell("tp2")}
        {cell("tp3")}
      </div>
    </div>
  );
}
