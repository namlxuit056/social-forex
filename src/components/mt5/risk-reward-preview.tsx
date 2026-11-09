import { cn } from "@/lib/utils";

export function SlAmountHint({ amount }: { amount: number | null }) {
  if (amount == null) return null;
  return (
    <p className={cn("mt-1 font-mono text-xs", amount > 0 ? "text-danger" : "text-muted-foreground")}>
      {amount > 0 ? `≈ -$${amount.toFixed(2)} if hit` : "On the profit side — no loss if hit"}
    </p>
  );
}

export function TpAmountHint({ amount }: { amount: number | null }) {
  if (amount == null) return null;
  return (
    <p className={cn("mt-1 font-mono text-xs", amount > 0 ? "text-success" : "text-muted-foreground")}>
      {amount > 0 ? `≈ +$${amount.toFixed(2)} if hit` : "On the loss side — no gain if hit"}
    </p>
  );
}

export function RiskRewardPreview({ riskReward }: { riskReward: number | null }) {
  if (riskReward == null) return null;
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2">
      <span className="text-xs text-muted-foreground">Risk : Reward</span>
      <span
        className={cn(
          "font-mono text-sm font-bold",
          riskReward >= 2
            ? "text-success"
            : riskReward >= 1
              ? "text-warning"
              : "text-destructive",
        )}
      >
        1 : {riskReward.toFixed(2)}
      </span>
    </div>
  );
}
