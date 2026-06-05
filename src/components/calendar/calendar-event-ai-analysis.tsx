"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Loader2, Lock, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/lib/calendar/types";

type AiCalendarImpactResponse = {
  impact?: {
    summary: string;
    keyDrivers: Array<{
      currency: string;
      event: string;
      whyItMatters: string;
      bias: "bullish" | "bearish" | "mixed" | "volatility";
      affectedPairs: string[];
      watchLevel: string;
    }>;
    checklist: string[];
  };
  disclaimer?: string;
  error?: string;
};

type Props = {
  event: CalendarEvent;
  compact?: boolean;
};

function biasClass(bias: string) {
  if (bias === "bullish") return "border-emerald-500/40 bg-emerald-500/12 text-emerald-200";
  if (bias === "bearish") return "border-red-500/40 bg-red-500/12 text-red-200";
  if (bias === "volatility") return "border-amber-500/40 bg-amber-500/12 text-amber-100";
  return "border-sky-500/40 bg-sky-500/12 text-sky-100";
}

export function CalendarEventAiAnalysis({ event, compact = false }: Props) {
  const t = useTranslations("calendar");
  const tc = useTranslations("common");
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AiCalendarImpactResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isGuest = status !== "loading" && !session?.user;
  const disabled = loading || status === "loading" || isGuest;

  async function analyze() {
    if (!session?.user) {
      setError(t("aiLoginRequired"));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/calendar-impact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: [event] }),
      });
      const payload = (await res.json().catch(() => ({}))) as AiCalendarImpactResponse;
      if (!res.ok || !payload.impact) {
        setError(payload.error ?? t("aiError"));
        return;
      }
      setData(payload);
    } catch {
      setError(t("aiError"));
    } finally {
      setLoading(false);
    }
  }

  const driver = data?.impact?.keyDrivers[0];

  return (
    <div className={cn("space-y-2", compact ? "mt-3" : "")}>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={analyze}
          disabled={disabled}
          className="gap-1.5"
        >
          {loading ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              {t("aiAnalyzing")}
            </>
          ) : isGuest ? (
            <>
              <Lock className="size-3.5" />
              {t("aiLoginButton")}
            </>
          ) : (
            <>
              <Sparkles className="size-3.5" />
              {t("aiAnalyzeEventButton")}
            </>
          )}
        </Button>
        {isGuest ? (
          <span className="text-xs text-muted-foreground">
            {t("aiLoginRequired")}{" "}
            <Link
              href={{ pathname: "/auth/signin", query: { callbackUrl: "/calendar" } }}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {tc("signIn")}
            </Link>
          </span>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}

      {data?.impact ? (
        <div className="rounded-lg border border-primary/20 bg-primary/6 p-3">
          <p className="text-sm leading-relaxed text-foreground/90">
            {data.impact.summary}
          </p>

          {driver ? (
            <div className="mt-3 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="font-mono">
                  {driver.currency}
                </Badge>
                <Badge variant="outline" className={cn(biasClass(driver.bias))}>
                  {t(`aiBias.${driver.bias}`)}
                </Badge>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {driver.whyItMatters}
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground/90">
                <span className="font-medium text-foreground/80">
                  {t("aiWatch")}:
                </span>{" "}
                {driver.watchLevel}
              </p>
              <div className="flex flex-wrap gap-1">
                {driver.affectedPairs.map((pair) => (
                  <span
                    key={pair}
                    className="rounded bg-muted px-2 py-0.5 font-mono text-[11px] text-foreground/85"
                  >
                    {pair}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {data.impact.checklist.length > 0 ? (
            <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
              {data.impact.checklist.slice(0, 3).map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
