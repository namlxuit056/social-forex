import { affectedPairsForCurrency } from "@/lib/calendar/pairs";
import { QUOTE_BY_SYMBOL } from "@/lib/quotes/definitions";
import type { CalendarEvent } from "@/lib/calendar/types";

export type ActionBias = "buy" | "sell" | "neutral";
export type CurrencyBias = "bullish" | "bearish" | "neutral";

export type ActualSignal = {
  currency: string;
  bias: CurrencyBias;
  /** Giá trị đối chiếu: so với forecast nếu có, fallback previous. */
  baseline: "forecast" | "previous";
  pairs: { pair: string; actionBias: ActionBias }[];
};

/** Chỉ số mà actual THẤP hơn kỳ vọng lại tốt cho đồng tiền (thất nghiệp, nợ xấu...). */
const INVERSE_INDICATOR_KEYWORDS = [
  "unemployment",
  "jobless",
  "claims",
  "deficit",
  "thất nghiệp",
  "trợ cấp thất nghiệp",
];

function isInverseIndicator(title: string) {
  const lower = title.toLowerCase();
  return INVERSE_INDICATOR_KEYWORDS.some((kw) => lower.includes(kw));
}

/** Parse chuỗi số liệu lịch kinh tế ("3.5%", "199K", "(0.4%)", "1,234", "$1.2B") thành number. */
export function parseIndicatorValue(raw: string): number | null {
  let s = raw.trim();
  if (!s || s === "-") return null;

  let negative = false;
  if (s.startsWith("(") && s.endsWith(")")) {
    negative = true;
    s = s.slice(1, -1);
  }
  s = s.replace(/,/g, "");
  // Bỏ ký hiệu tiền tệ đứng đầu (TradingView format: "$1.2B", "£4.5", "C$0.3").
  s = s.replace(/^[^0-9+\-.]+/, "");

  let multiplier = 1;
  const suffixMatch = s.match(/([KMBT])%?$/i);
  if (suffixMatch) {
    const suf = suffixMatch[1].toUpperCase();
    multiplier = suf === "K" ? 1e3 : suf === "M" ? 1e6 : suf === "B" ? 1e9 : 1e12;
    s = s.slice(0, suffixMatch.index);
  }
  s = s.replace(/%/g, "").trim();

  const num = Number.parseFloat(s);
  if (Number.isNaN(num)) return null;
  return negative ? -(num * multiplier) : num * multiplier;
}

function pairActionForCurrencyBias(pair: string, currency: string, bias: "bullish" | "bearish"): ActionBias {
  const group = QUOTE_BY_SYMBOL[pair]?.group;
  // Metal/energy/crypto trong app đều quote theo USD -> USD đóng vai trò quote currency.
  if (group === "metal" || group === "energy" || group === "crypto") {
    return bias === "bullish" ? "sell" : "buy";
  }
  const base = pair.slice(0, 3);
  const quote = pair.slice(3, 6);
  if (base === currency) return bias === "bullish" ? "buy" : "sell";
  if (quote === currency) return bias === "bullish" ? "sell" : "buy";
  return "neutral";
}

/**
 * Tín hiệu buy/sell dựa trên so sánh actual vs forecast/previous — thuần công thức,
 * không gọi AI. Trả về null nếu thiếu actual hoặc không parse được số liệu để so sánh.
 */
export function computeActualSignal(event: CalendarEvent): ActualSignal | null {
  if (!event.actual?.trim()) return null;
  const actualValue = parseIndicatorValue(event.actual);
  if (actualValue === null) return null;

  const baseline: "forecast" | "previous" | null = event.forecast?.trim()
    ? "forecast"
    : event.previous?.trim()
      ? "previous"
      : null;
  if (!baseline) return null;

  const baselineValue = parseIndicatorValue(baseline === "forecast" ? event.forecast! : event.previous!);
  if (baselineValue === null) return null;

  const diff = actualValue - baselineValue;
  const tolerance = Math.max(Math.abs(baselineValue) * 0.005, 0.0001);

  const pairs = affectedPairsForCurrency(event.currency).filter((p) => p in QUOTE_BY_SYMBOL);

  if (Math.abs(diff) <= tolerance) {
    return {
      currency: event.currency,
      bias: "neutral",
      baseline,
      pairs: pairs.map((pair) => ({ pair, actionBias: "neutral" as const })),
    };
  }

  const beat = diff > 0;
  const bullish = isInverseIndicator(event.title) ? !beat : beat;
  const bias: CurrencyBias = bullish ? "bullish" : "bearish";

  return {
    currency: event.currency,
    bias,
    baseline,
    pairs: pairs.map((pair) => ({ pair, actionBias: pairActionForCurrencyBias(pair, event.currency, bias) })),
  };
}
