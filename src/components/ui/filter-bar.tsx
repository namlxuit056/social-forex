import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** One wrapping row of filter controls on a card, with an optional footnote. */
export function FilterBar({
  children,
  footnote,
  className,
}: {
  children: ReactNode;
  footnote?: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-slot="filter-bar"
      className={cn("space-y-2 rounded-xl border border-border bg-card p-3 sm:p-4", className)}
    >
      <div className="flex flex-wrap items-end gap-3">{children}</div>
      {footnote ? <p className="text-xs text-muted-foreground">{footnote}</p> : null}
    </div>
  );
}
