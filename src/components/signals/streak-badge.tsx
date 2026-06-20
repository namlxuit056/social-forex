import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

type StreakType = "journal" | "plan" | "signal";

const typeColors: Record<StreakType, string> = {
  journal: "text-blue-500",
  plan: "text-violet-500",
  signal: "text-orange-500",
};

export function StreakBadge({
  count,
  type,
  className,
}: {
  count: number;
  type: StreakType;
  className?: string;
}) {
  if (count <= 0) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-semibold",
        typeColors[type],
        className,
      )}
      title={`${count} ngày liên tiếp`}
    >
      <Flame className="size-3.5" aria-hidden />
      {count}
    </span>
  );
}
