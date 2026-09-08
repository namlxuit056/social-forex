import type { ExternalSignalMeta, SignalDetail, SignalSource } from "@/lib/quotes/signal-sources";

/**
 * Định dạng văn bản cho tín hiệu từ nguồn ngoài TradingView. Dùng chung cho cả server
 * (push, namespace "signalSources") lẫn client (trang lịch sử, useTranslations("signalSources")).
 * `t` là translator bất kỳ đã trỏ vào namespace "signalSources".
 */
type Translator = (key: string, params?: Record<string, string | number>) => string;

function signed(n: number): string {
  return n > 0 ? `+${n.toLocaleString("en-US")}` : n.toLocaleString("en-US");
}

export function sourceLabel(t: Translator, source: SignalSource): string {
  return t(source);
}

export function sourceBlurb(t: Translator, source: SignalSource): string {
  return t(`${source}Blurb`);
}

/** Một dòng số liệu tóm tắt tín hiệu (VD "Đám đông 74% MUA · 26% BÁN"). */
export function describeDetail(t: Translator, detail: SignalDetail): string {
  if (detail.kind === "crowd") {
    const base = t("detailCrowd", { longPct: detail.longPct, shortPct: detail.shortPct });
    if (detail.heavyZone != null) {
      return `${base} · ${t("detailBookZone", { price: detail.heavyZone })}`;
    }
    return base;
  }
  return t("detailCot", { netPct: detail.netPct, weekChange: signed(detail.weekChange) });
}

/** Tiêu đề + nội dung push cho tín hiệu nguồn ngoài. */
export function buildExternalPush(
  t: Translator,
  meta: ExternalSignalMeta,
): { title: string; body: string } {
  const title = t("pushTitle", {
    symbol: meta.symbol,
    source: t(meta.source),
    dir: meta.signal,
  });
  const detailText = describeDetail(t, meta.detail);
  const stanceText = t(meta.stance === "contrarian" ? "stanceContrarian" : "stanceTrend");
  const agreeText =
    meta.tvAgree === null
      ? ""
      : ` · ${t(meta.tvAgree ? "tvAgree" : "tvDisagree")}`;
  return { title, body: `${detailText} — ${stanceText}${agreeText}` };
}
