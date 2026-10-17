"use client";

import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type FieldSelectOption<V extends string> = { value: V; label: ReactNode };

/**
 * Labelled dropdown at the standard 36px control height. Replaces the native
 * `<select>` so the menu matches the app instead of the OS.
 */
export function FieldSelect<V extends string>({
  id,
  label,
  value,
  options,
  onValueChange,
  className,
  triggerClassName,
}: {
  id: string;
  label?: ReactNode;
  value: V;
  options: ReadonlyArray<FieldSelectOption<V>>;
  onValueChange: (value: V) => void;
  className?: string;
  triggerClassName?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      {label ? (
        <Label htmlFor={id} className="text-xs">
          {label}
        </Label>
      ) : null}
      <Select
        items={options}
        value={value}
        onValueChange={(next) => {
          if (next != null) onValueChange(next as V);
        }}
      >
        <SelectTrigger id={id} className={cn("h-9 w-full bg-card", triggerClassName)}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
