"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Target, TrendingDown } from "lucide-react";
import type { EdgeCheckFacet, EdgeCheckResult } from "@/lib/journal/edge-check";

const SESSION_KEY = {
  asia: "sessionAsia",
  london: "sessionLondon",
  newyork: "sessionNewYork",
} as const;

/**
 * Gợi ý mềm ngay lúc đặt lệnh: win rate của chính trader trong bối cảnh này so với
 * mức chung của họ. Vàng khi là vùng yếu, xanh khi là vùng mạnh, ẩn khi chưa đủ dữ liệu.
 * `timeFacets={false}` bỏ phiên/thứ — dùng khi lệnh có thể đã vào từ trước (form journal).
 */
export function EdgeCheckHint({
  symbol,
  direction,
  timeFacets = true,
  className = "mb-4",
}: {
  symbol: string;
  direction: string;
  timeFacets?: boolean;
  className?: string;
}) {
  const t = useTranslations("journal");
  const [result, setResult] = useState<EdgeCheckResult | null>(null);

  const q = symbol.trim().toUpperCase();

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(
      () => {
        if (q.length < 6) {
          setResult(null);
          return;
        }
        const params = new URLSearchParams({ symbol: q, direction });
        if (!timeFacets) params.set("time", "0");
        fetch(`/api/journal/edge-check?${params.toString()}`, { signal: controller.signal })
          .then((res) => (res.ok ? res.json() : null))
          .then((data: EdgeCheckResult | null) => setResult(data))
          .catch(() => {});
      },
      q.length < 6 ? 0 : 400,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, direction, timeFacets]);

  const headline = result?.headline;
  if (!result || !headline || result.verdict === "neutral") return null;

  function contextLabel(facet: EdgeCheckFacet): string {
    if (facet.dimension === "session") {
      const key = SESSION_KEY[facet.key as keyof typeof SESSION_KEY];
      return key ? t(key) : facet.key;
    }
    if (facet.dimension === "weekday") return t("edgeCheckWeekday", { day: facet.key });
    if (facet.dimension === "direction") return t("edgeCheckDirection", { direction: facet.key });
    return facet.key;
  }

  const weak = result.verdict === "weak";
  const Icon = weak ? TrendingDown : Target;

  return (
    <div
      className={`${className} flex items-start gap-3 rounded-lg border p-3 text-sm ${
        weak
          ? "border-amber-500/30 bg-amber-50 text-amber-800 dark:bg-amber-950/20 dark:text-amber-200"
          : "border-emerald-500/30 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-200"
      }`}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <p>
        {t(weak ? "edgeCheckWeak" : "edgeCheckStrong", {
          context: contextLabel(headline),
          winRate: headline.winRate,
          count: headline.total,
          baseline: result.baselineWinRate,
        })}
      </p>
    </div>
  );
}
