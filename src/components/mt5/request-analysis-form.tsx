"use client";

import { useState, useTransition } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { BrainCircuit, Loader2 } from "lucide-react";
import { requestAiAnalysis } from "@/actions/ai-trade-proposal";
import { QUOTE_DEFINITIONS } from "@/lib/quotes/definitions";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

type Props = {
  hasConnection: boolean;
};

export function RequestAnalysisForm({ hasConnection }: Props) {
  const t = useTranslations("mt5");
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) === "en" ? "en" : "vi";
  const [symbol, setSymbol] = useState("XAUUSD");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorKey, setErrorKey] = useState<string>("");
  const [errorFallback, setErrorFallback] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const ERROR_KEYS: Record<string, string> = {
    vip_required: "analysisVipRequired",
    no_connection: "analysisNoConnection",
    rate_limited: "analysisRateLimited",
    ai_unavailable: "analysisAiUnavailable",
    analysis_failed: "analysisFailed",
    unknown_symbol: "analysisUnknownSymbol",
  };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("idle");
    startTransition(async () => {
      const result = await requestAiAnalysis(symbol, locale);
      if (result.ok) {
        setStatus("success");
        router.refresh();
        setTimeout(() => setStatus("idle"), 4000);
      } else {
        setStatus("error");
        const key = ERROR_KEYS[result.error ?? ""];
        setErrorKey(key ?? "");
        setErrorFallback(key ? "" : (result.error ?? t("analysisError")));
      }
    });
  }

  const errorMsg = errorKey ? t(errorKey as Parameters<typeof t>[0]) : errorFallback;

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      <select
        value={symbol}
        onChange={(e) => setSymbol(e.target.value)}
        disabled={!hasConnection || isPending}
        className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
      >
        {QUOTE_DEFINITIONS.map((q) => (
          <option key={q.symbol} value={q.symbol}>
            {q.symbol} — {q.name}
          </option>
        ))}
      </select>

      <Button type="submit" size="sm" disabled={!hasConnection || isPending}>
        {isPending ? (
          <>
            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            {t("analysingBtn")}
          </>
        ) : (
          <>
            <BrainCircuit className="mr-1.5 size-3.5" />
            {t("analysisBtn")}
          </>
        )}
      </Button>

      {!hasConnection && (
        <span className="text-xs text-muted-foreground">
          {t("analysisNoConnectionHint")}
        </span>
      )}
      {status === "success" && (
        <span className="text-xs text-green-500 font-medium">
          {t("analysisSuccess")}
        </span>
      )}
      {status === "error" && (
        <span className="flex items-center gap-2 text-xs text-destructive">
          {errorMsg}
          {errorKey === "analysisVipRequired" && (
            <Link
              href="/upgrade-vip"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              {t("analysisUpgradeVip")}
            </Link>
          )}
        </span>
      )}
    </form>
  );
}
