import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Standard page title block. Page titles are `text-xl`; larger sizes are
 * reserved for marketing heroes (home), so every app screen reads the same.
 */
export function PageHeader({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  /** Buttons/links aligned to the right of the title on wide screens. */
  actions?: ReactNode;
  /** Extra content under the description (jump links, badges). */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("space-y-2", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {description ? (
            <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
      {children}
    </header>
  );
}
