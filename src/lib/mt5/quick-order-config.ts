export type QuickOrderConfig = {
  symbol: string;
  volume: number;
};

export const DEFAULT_QUICK_ORDER_CONFIG: QuickOrderConfig = {
  symbol: "XAUUSD",
  volume: 0.02,
};

const STORAGE_KEY = "sf:quick-order-config";

export function loadQuickOrderConfig(): QuickOrderConfig {
  if (typeof window === "undefined") return DEFAULT_QUICK_ORDER_CONFIG;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_QUICK_ORDER_CONFIG;
    const parsed = JSON.parse(raw) as Partial<QuickOrderConfig>;
    if (typeof parsed.symbol === "string" && parsed.symbol && typeof parsed.volume === "number" && parsed.volume > 0) {
      return { symbol: parsed.symbol, volume: parsed.volume };
    }
  } catch {
    // ignore malformed storage
  }
  return DEFAULT_QUICK_ORDER_CONFIG;
}

export function saveQuickOrderConfig(config: QuickOrderConfig) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore storage errors (private mode, quota)
  }
}
