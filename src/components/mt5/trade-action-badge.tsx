import { Minus, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";

export function tradeActionBadge(action: "hold" | "trim" | "close"): { icon: LucideIcon; className: string } {
  if (action === "close") {
    return { icon: TrendingDown, className: "border-destructive/30 bg-destructive/8 text-destructive" };
  }
  if (action === "trim") {
    return { icon: Minus, className: "border-amber-500/30 bg-amber-500/8 text-warning" };
  }
  return { icon: TrendingUp, className: "border-emerald-500/30 bg-emerald-500/8 text-success" };
}
