"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Sparkles, Lock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AiSuggestionCard } from "@/components/ai/ai-suggestion-card";
import type { AiSuggestResponse, AiSuggestError } from "@/lib/ai/types";

const FREE_SYMBOL = "EURUSD";

interface Props {
  symbol: string;
}

export function AiAnalysisPanel({ symbol }: Props) {
  const { data: session } = useSession();
  const router = useRouter();
  const t = useTranslations("ai");

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AiSuggestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setData(null);
    setError(null);
  }, [symbol]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function startCooldown(ms: number) {
    setCooldown(Math.ceil(ms / 1000));
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  const analyze = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol }),
      });

      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as AiSuggestError;
        if (res.status === 429 && errBody.retryAfterMs) {
          startCooldown(errBody.retryAfterMs);
        }
        setError(errBody.error ?? t("error"));
        return;
      }

      const result = (await res.json()) as AiSuggestResponse;
      setData(result);
    } catch {
      setError(t("error"));
    } finally {
      setLoading(false);
    }
  }, [symbol, t]);

  const handlePostSignal = useCallback(() => {
    if (!data?.suggestion) return;
    const s = data.suggestion;
    const params = new URLSearchParams({
      symbol: data.symbol,
      direction: s.direction,
      entry: String(s.entry),
      stopLoss: String(s.stopLoss),
      takeProfit: String(s.takeProfit),
      notes: `AI suggestion (confidence: ${s.confidence}/5)`,
    });
    router.push(`/signals?${params.toString()}`);
  }, [data, router]);

  const isLocked = symbol !== FREE_SYMBOL && !session?.user;

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border/70 bg-card/45 px-4 py-3">
        <div className="flex items-start gap-2">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <div>
            <h2 className="font-heading text-sm font-semibold text-foreground">
              {t("expertTitle")}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {t("expertSubtitle")}
            </p>
          </div>
        </div>
      </div>

      {/* Analyze button */}
      <div className="flex items-center gap-3">
        <Button
          onClick={analyze}
          disabled={loading || cooldown > 0 || isLocked}
          size="sm"
          className={cn(
            "gap-1.5",
            data
              ? "bg-muted text-foreground hover:bg-muted/80"
              : "bg-primary text-primary-foreground",
          )}
        >
          {loading ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              {t("analyzing")}
            </>
          ) : cooldown > 0 ? (
            t("retryIn", { seconds: cooldown })
          ) : (
            <>
              <Sparkles className="size-3.5" />
              {t("analyzeButton")}
            </>
          )}
        </Button>

        {isLocked && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Lock className="size-3" />
            {t("freeHint")}
          </span>
        )}

        {symbol === FREE_SYMBOL && !session?.user && (
          <span className="text-[10px] text-muted-foreground">
            Free: EURUSD
          </span>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-xs text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Result */}
      {data && (
        <AiSuggestionCard
          data={data}
          showPostButton={!!session?.user}
          onPostSignal={handlePostSignal}
        />
      )}
    </div>
  );
}
