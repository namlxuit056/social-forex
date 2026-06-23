"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Sparkles, Loader2, Crown, CheckCircle2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { confirmScreenerPick } from "@/actions/screener";
import type { AiPickResult, AiPicksResponse, AiPicksError } from "@/app/api/screener/ai-picks/route";

type Props = {
  isLoggedIn: boolean;
  isVip: boolean;
};

function priceDecimals(p: number): number {
  if (p >= 10_000) return 1;
  if (p >= 100) return 2;
  if (p >= 10) return 3;
  return 4;
}

function QualityBar({ score }: { score: number }) {
  const color =
    score >= 70 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-red-500";
  const textColor =
    score >= 70 ? "text-emerald-500" : score >= 50 ? "text-amber-500" : "text-red-500";
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1.5 flex-1 rounded-full bg-muted/50">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${score}%` }} />
      </div>
      <span className={cn("text-xs font-bold tabular-nums w-7 text-right", textColor)}>
        {score}
      </span>
    </div>
  );
}

function ConfidenceStars({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={cn("text-[10px]", i < value ? "text-amber-400" : "text-muted-foreground/25")}>
          ★
        </span>
      ))}
    </div>
  );
}

type ConfirmView = "idle" | "form" | "submitting" | "done" | "error";

function PickCard({ pick, t }: { pick: AiPickResult; t: ReturnType<typeof useTranslations<"screener">> }) {
  const isLong = pick.direction === "LONG";
  const dec = priceDecimals(pick.price);
  const [view, setView] = useState<ConfirmView>("idle");
  const [lotSize, setLotSize] = useState("0.01");
  const [signalId, setSignalId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    const lot = parseFloat(lotSize);
    setView("submitting");
    startTransition(async () => {
      const result = await confirmScreenerPick({
        symbol: pick.symbol,
        direction: pick.direction,
        entry: pick.entry,
        stopLoss: pick.stopLoss,
        takeProfit: pick.takeProfit,
        confidence: pick.confidence,
        qualityScore: pick.qualityScore,
        reasoning: pick.reasoning,
        lotSize: lot > 0 ? lot : undefined,
      });
      if (result.ok && result.signalId) {
        setSignalId(result.signalId);
        setView("done");
      } else {
        setErrorMsg(result.error ?? "error");
        setView("error");
      }
    });
  }

  return (
    <div className={cn(
      "rounded-lg border border-border/70 bg-card flex flex-col gap-2.5 p-3.5 border-l-[3px]",
      isLong ? "border-l-emerald-500" : "border-l-red-500",
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="font-mono font-bold text-base text-foreground">{pick.symbol}</span>
          <span className="ml-1.5 text-xs text-muted-foreground">{pick.name}</span>
        </div>
        <span className={cn(
          "rounded px-1.5 py-0.5 text-[11px] font-bold shrink-0",
          isLong ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-red-500/15 text-red-500",
        )}>
          {isLong ? "▲ LONG" : "▼ SHORT"}
        </span>
      </div>

      {/* Quality + confidence */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{t("aiPicksQuality")}</span>
          <ConfidenceStars value={pick.confidence} />
        </div>
        <QualityBar score={pick.qualityScore} />
      </div>

      {/* Aligned timeframes */}
      <div className="flex gap-1 flex-wrap">
        {["M15", "H1", "H4", "D1"].map((tf) => {
          const aligned = pick.alignedTimeframes.includes(tf);
          return (
            <span key={tf} className={cn(
              "text-[10px] font-medium rounded px-1.5 py-0.5",
              aligned
                ? isLong
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-red-500/10 text-red-500"
                : "bg-muted/30 text-muted-foreground/40",
            )}>
              {tf} {aligned ? "✓" : "–"}
            </span>
          );
        })}
      </div>

      {/* Entry / SL / TP */}
      <div className="grid grid-cols-3 gap-1 text-xs bg-muted/30 rounded p-2">
        <div>
          <div className="text-muted-foreground">{t("aiPicksEntry")}</div>
          <div className="font-mono font-semibold">{pick.entry.toFixed(dec)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">SL</div>
          <div className="font-mono font-semibold text-red-500">{pick.stopLoss.toFixed(dec)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">TP</div>
          <div className="font-mono font-semibold text-emerald-500">{pick.takeProfit.toFixed(dec)}</div>
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-0.5">
        {pick.checklist.slice(0, 4).map((item, i) => (
          <div key={i} className="flex items-start gap-1.5">
            <span className={cn(
              "mt-0.5 text-[10px] font-bold shrink-0",
              item.status === "pass" ? "text-emerald-500" : item.status === "warn" ? "text-amber-500" : "text-red-500",
            )}>
              {item.status === "pass" ? "✓" : item.status === "warn" ? "⚠" : "✗"}
            </span>
            <span className="text-[11px] text-muted-foreground leading-relaxed line-clamp-1">
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {/* Reasoning */}
      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
        {pick.reasoning}
      </p>

      {/* Footer actions */}
      <div className="mt-auto space-y-2">
        <Link href={`/chart?symbol=${pick.symbol}`} className="text-xs text-primary hover:underline">
          {t("viewChart")} →
        </Link>

        {/* Confirm section */}
        {view === "done" && signalId ? (
          <div className="flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2.5 py-1.5">
            <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              {t("aiPicksConfirmDone")}
            </span>
            <Link href={`/signals/${signalId}`} className="ml-auto text-xs text-primary hover:underline shrink-0">
              {t("aiPicksViewSignal")}
            </Link>
          </div>
        ) : view === "error" ? (
          <div className="flex items-center gap-2 rounded-md bg-red-500/10 px-2.5 py-1.5">
            <span className="text-xs text-red-500 flex-1">{t(`aiPicksErr_${errorMsg}`)}</span>
            <button onClick={() => setView("idle")} className="text-xs text-muted-foreground hover:text-foreground">
              {t("aiPicksRetry")}
            </button>
          </div>
        ) : view === "form" || view === "submitting" ? (
          <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/20 px-2.5 py-2">
            <span className="text-xs text-muted-foreground shrink-0">{t("aiPicksLot")}</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={lotSize}
              onChange={(e) => setLotSize(e.target.value)}
              disabled={isPending}
              className="w-20 h-7 rounded border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            />
            <button
              onClick={handleConfirm}
              disabled={isPending}
              className={cn(
                "rounded px-2.5 py-1 text-xs font-medium transition shrink-0",
                isLong
                  ? "bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                  : "bg-red-600 text-white hover:bg-red-700 disabled:opacity-50",
              )}
            >
              {isPending ? <Loader2 className="size-3 animate-spin" /> : t("aiPicksConfirm")}
            </button>
            <button
              onClick={() => setView("idle")}
              disabled={isPending}
              className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={() => setView("form")}
            className={cn(
              "w-full rounded-md py-1.5 text-xs font-medium transition",
              isLong
                ? "border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                : "border border-red-500/40 text-red-500 hover:bg-red-500/10",
            )}
          >
            {t("aiPicksConfirmOpen")} {isLong ? "▲" : "▼"}
          </button>
        )}
      </div>
    </div>
  );
}

type FetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; data: AiPicksResponse }
  | { status: "unavailable" }
  | { status: "error" };

export function AiPicksPanel({ isLoggedIn, isVip }: Props) {
  const locale = useLocale();
  const t = useTranslations("screener");
  const [state, setState] = useState<FetchState>({ status: "idle" });

  function handleAnalyze() {
    if (!isVip || state.status === "loading") return;
    setState({ status: "loading" });

    fetch(`/api/screener/ai-picks?locale=${locale}`)
      .then(async (res) => {
        if (res.status === 503) {
          const body = (await res.json()) as AiPicksError;
          if (body.error === "ai_unavailable") throw new Error("unavailable");
        }
        if (!res.ok) throw new Error("error");
        return res.json() as Promise<AiPicksResponse>;
      })
      .then((data) => setState({ status: "done", data }))
      .catch((err) =>
        setState({ status: err.message === "unavailable" ? "unavailable" : "error" }),
      );
  }

  // --- Render: not logged in ---
  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/10 p-4">
        <div className="flex items-center gap-2.5">
          <Sparkles className="size-4 text-primary/60 shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">{t("aiPicksTitle")}</p>
            <p className="text-xs text-muted-foreground">{t("aiPicksLoginHint")}</p>
          </div>
        </div>
        <Link
          href="/auth/signin"
          className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition"
        >
          {t("aiPicksLogin")}
        </Link>
      </div>
    );
  }

  // --- Render: logged in but not VIP ---
  if (!isVip) {
    return (
      <div className="flex items-center justify-between gap-4 rounded-lg border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 p-4">
        <div className="flex items-center gap-2.5">
          <Crown className="size-4 text-amber-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">{t("aiPicksTitle")}</p>
            <p className="text-xs text-amber-700 dark:text-amber-300/70">{t("aiPicksVipHint")}</p>
          </div>
        </div>
        <Link
          href="/profile"
          className="shrink-0 rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition"
        >
          {t("aiPicksUpgrade")}
        </Link>
      </div>
    );
  }

  // --- Render: VIP — idle ---
  if (state.status === "idle") {
    return (
      <div className="flex items-center justify-between gap-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center gap-2.5">
          <Sparkles className="size-4 text-primary shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">{t("aiPicksTitle")}</p>
            <p className="text-xs text-muted-foreground">{t("aiPicksIdleHint")}</p>
          </div>
        </div>
        <button
          onClick={handleAnalyze}
          className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition"
        >
          {t("aiPicksAnalyze")}
        </button>
      </div>
    );
  }

  // --- Render: loading ---
  if (state.status === "loading") {
    return (
      <div className="rounded-lg border border-border/60 bg-muted/10 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Loader2 className="size-4 text-primary animate-spin" />
          <span className="text-sm font-medium text-muted-foreground">{t("aiPicksLoading")}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border border-border/40 bg-muted/20 h-52 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // --- Render: unavailable ---
  if (state.status === "unavailable") {
    return (
      <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/10 p-4">
        <p className="text-xs text-muted-foreground">{t("aiPicksUnavailable")}</p>
      </div>
    );
  }

  // --- Render: error ---
  if (state.status === "error") {
    return (
      <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/10 p-4">
        <p className="text-xs text-muted-foreground">{t("aiPicksError")}</p>
        <button
          onClick={handleAnalyze}
          className="shrink-0 text-xs text-primary hover:underline"
        >
          {t("aiPicksRetry")}
        </button>
      </div>
    );
  }

  // --- Render: done ---
  const { picks } = state.data;

  if (picks.length === 0) {
    return (
      <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/10 p-4">
        <div className="flex items-center gap-2.5">
          <Sparkles className="size-4 text-muted-foreground/40 shrink-0" />
          <p className="text-xs text-muted-foreground">{t("aiPicksNone")}</p>
        </div>
        <button
          onClick={handleAnalyze}
          className="shrink-0 text-xs text-primary hover:underline"
        >
          {t("aiPicksRetry")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">{t("aiPicksTitle")}</span>
          <span className="text-xs text-muted-foreground">· {picks.length} {t("aiPicksCount")}</span>
        </div>
        <button
          onClick={handleAnalyze}
          className="text-xs text-muted-foreground hover:text-foreground transition"
        >
          {t("aiPicksRefresh")}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {picks.map((pick) => (
          <PickCard key={pick.symbol} pick={pick} t={t} />
        ))}
      </div>

      <p className="text-xs text-muted-foreground/50">{t("aiPicksDisclaimer")}</p>
    </div>
  );
}
