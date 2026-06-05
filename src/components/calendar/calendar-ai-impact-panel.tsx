"use client";

import { useMemo, useState } from "react";
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
  generatedAt?: string;
  disclaimer?: string;
  error?: string;
};

type Props = {
  events: CalendarEvent[];
};

function biasClass(bias: string) {
  if (bias === "bullish") return "border-emerald-500/40 bg-emerald-500/12 text-emerald-200";
  if (bias === "bearish") return "border-red-500/40 bg-red-500/12 text-red-200";
  if (bias === "volatility") return "border-amber-500/40 bg-amber-500/12 text-amber-100";
  return "border-sky-500/40 bg-sky-500/12 text-sky-100";
}

export function CalendarAiImpactPanel({ events }: Props) {
  const t = useTranslations("calendar");
  const tc = useTranslations("common");
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AiCalendarImpactResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const topEvents = useMemo(
    () =>
      [...events]
        .sort((a, b) => {
          const impactRank = { high: 0, medium: 1, low: 2 };
          return (
            impactRank[a.impact] - impactRank[b.impact] ||
            new Date(a.timeUtc).getTime() - new Date(b.timeUtc).getTime()
          );
        })
        .slice(0, 12),
    [events],
  );

  const isGuest = status !== "loading" && !session?.user;
  const disabled = loading || status === "loading" || topEvents.length === 0 || isGuest;

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
        body: JSON.stringify({ events: topEvents }),
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

  return (
    <section className="rounded-xl border border-border/70 bg-card/45 p-4 ring-1 ring-foreground/5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" aria-hidden />
            <h2 className="font-heading text-base font-semibold text-foreground">
              {t("aiImpactTitle")}
            </h2>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {t("aiImpactDesc")}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={analyze}
          disabled={disabled}
          className="w-full gap-1.5 md:w-auto"
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
              {t("aiAnalyzeButton")}
            </>
          )}
        </Button>
      </div>

      {isGuest ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {t("aiLoginRequired")}{" "}
          <Link
            href={{ pathname: "/auth/signin", query: { callbackUrl: "/calendar" } }}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {tc("signIn")}
          </Link>
        </p>
      ) : null}

      {topEvents.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{t("aiNoEvents")}</p>
      ) : null}

      {error ? (
        <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {data?.impact ? (
        <div className="mt-4 space-y-4">
          <p className="rounded-lg border border-primary/20 bg-primary/8 px-3 py-2 text-sm leading-relaxed text-foreground/90">
            {data.impact.summary}
          </p>

          <div className="grid gap-3 lg:grid-cols-2">
            {data.impact.keyDrivers.map((driver, index) => (
              <article
                key={`${driver.currency}-${driver.event}-${index}`}
                className="rounded-lg border border-border/65 bg-muted/15 p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="font-mono">
                    {driver.currency}
                  </Badge>
                  <Badge variant="outline" className={cn(biasClass(driver.bias))}>
                    {t(`aiBias.${driver.bias}`)}
                  </Badge>
                </div>
                <h3 className="mt-2 text-sm font-semibold text-foreground">
                  {driver.event}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {driver.whyItMatters}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground/90">
                  <span className="font-medium text-foreground/80">
                    {t("aiWatch")}:
                  </span>{" "}
                  {driver.watchLevel}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {driver.affectedPairs.map((pair) => (
                    <span
                      key={pair}
                      className="rounded bg-muted px-2 py-0.5 font-mono text-[11px] text-foreground/85"
                    >
                      {pair}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <div className="rounded-lg border border-border/65 bg-muted/15 p-3">
            <h3 className="text-sm font-semibold text-foreground">
              {t("aiChecklist")}
            </h3>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {data.impact.checklist.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </div>

          {data.disclaimer ? (
            <p className="text-xs text-muted-foreground">{data.disclaimer}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
