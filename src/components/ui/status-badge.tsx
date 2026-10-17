import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  IMPACT_TONE,
  type Impact,
  type Tone,
  directionTone,
  signalStatusTone,
  tierTone,
} from "@/lib/ui/status-map";

const TONE_CLASS: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  primary: "bg-primary text-primary-foreground",
  success: "bg-success-bg text-success",
  danger: "bg-danger-bg text-danger",
  warning: "bg-warning-bg text-warning",
  info: "bg-info-bg text-info",
};

/** Small status pill. Tone comes from `@/lib/ui/status-map`, never ad-hoc colours. */
export function ToneBadge({
  tone,
  children,
  className,
}: {
  tone: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      data-tone={tone}
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-1.5 text-xs font-medium",
        TONE_CLASS[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SignalStatusBadge({
  status,
  label,
  className,
}: {
  status: string;
  label: ReactNode;
  className?: string;
}) {
  return (
    <ToneBadge tone={signalStatusTone(status)} className={className}>
      {label}
    </ToneBadge>
  );
}

export function DirectionBadge({
  direction,
  className,
}: {
  direction: string;
  className?: string;
}) {
  return (
    <ToneBadge tone={directionTone(direction)} className={cn("font-semibold", className)}>
      {direction}
    </ToneBadge>
  );
}

export function ImpactBadge({
  impact,
  label,
  className,
}: {
  impact: Impact;
  label: ReactNode;
  className?: string;
}) {
  return (
    <ToneBadge tone={IMPACT_TONE[impact]} className={className}>
      {label}
    </ToneBadge>
  );
}

export function TierBadge({
  tier,
  label,
  className,
}: {
  tier: string;
  label?: ReactNode;
  className?: string;
}) {
  return (
    <ToneBadge tone={tierTone(tier)} className={className}>
      {label ?? tier}
    </ToneBadge>
  );
}
