/**
 * One place that decides what colour a status means. Every badge for signal
 * status, trade direction, news impact and tier reads its tone from here, so
 * "red" means the same thing on the signal list, the desk and the calendar.
 */

export type Tone = "neutral" | "primary" | "success" | "danger" | "warning" | "info";

export type SignalStatus = "PENDING" | "ACTIVE" | "CLOSED_WIN" | "CLOSED_LOSS" | "CANCELLED";

export const SIGNAL_STATUS_TONE: Record<SignalStatus, Tone> = {
  PENDING: "warning",
  ACTIVE: "info",
  CLOSED_WIN: "success",
  CLOSED_LOSS: "danger",
  CANCELLED: "neutral",
};

/** Translation keys in the `signals` namespace. */
export const SIGNAL_STATUS_LABEL_KEY: Record<SignalStatus, string> = {
  PENDING: "statusPending",
  ACTIVE: "statusActive",
  CLOSED_WIN: "statusClosedWin",
  CLOSED_LOSS: "statusClosedLoss",
  CANCELLED: "statusCancelled",
};

export function signalStatusTone(status: string): Tone {
  return SIGNAL_STATUS_TONE[status as SignalStatus] ?? "neutral";
}

export type Direction = "long" | "short";

/** Journal/signals say LONG/SHORT, MT5 says BUY/SELL (+ BUY_LIMIT etc.). */
export function normalizeDirection(raw: string | null | undefined): Direction | null {
  const x = (raw ?? "").trim().toUpperCase();
  if (x.startsWith("LONG") || x.startsWith("BUY")) return "long";
  if (x.startsWith("SHORT") || x.startsWith("SELL")) return "short";
  return null;
}

export function directionTone(raw: string | null | undefined): Tone {
  const d = normalizeDirection(raw);
  return d === "long" ? "success" : d === "short" ? "danger" : "neutral";
}

export type Impact = "high" | "medium" | "low";

export function normalizeImpact(raw: string | null | undefined): Impact {
  const x = (raw ?? "").trim().toLowerCase();
  if (x.includes("high")) return "high";
  if (x.includes("low")) return "low";
  return "medium";
}

export const IMPACT_TONE: Record<Impact, Tone> = {
  high: "danger",
  medium: "warning",
  low: "neutral",
};

export function tierTone(tier: string): Tone {
  return tier === "VIP" ? "primary" : "neutral";
}
