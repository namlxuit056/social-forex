"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * On/off filter chip. Selected state is neutral (no status colour) so a row
 * of chips reads as "which filters are on", not as a row of alerts.
 */
export function ToggleChip({
  pressed,
  className,
  ...props
}: Omit<ComponentProps<"button">, "type"> & { pressed: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cn(
        "inline-flex h-8 shrink-0 items-center rounded-lg border px-2.5 text-xs font-medium transition-colors",
        pressed
          ? "border-border-strong bg-muted text-foreground"
          : "border-border bg-card text-muted-foreground hover:bg-muted/60 hover:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

/** Mutually exclusive options in one pill (today/week, VN/UTC). */
export function Segmented<V extends string>({
  value,
  options,
  onValueChange,
  ariaLabel,
  className,
}: {
  value: V;
  options: ReadonlyArray<{ value: V; label: React.ReactNode }>;
  onValueChange: (value: V) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex h-9 w-fit items-center rounded-lg border border-border bg-muted/40 p-0.5",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => {
              if (!active) onValueChange(option.value);
            }}
            className={cn(
              "h-full rounded-md px-3 text-xs font-medium transition-colors",
              active
                ? "bg-card text-foreground ring-1 ring-border"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
