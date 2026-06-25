"use client";

import { useState, useEffect, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Zap, Loader2, Crown, CheckCircle2, ChevronDown } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { confirmScalpingPick } from "@/actions/scalping";
import { QUOTE_DEFINITIONS } from "@/lib/quotes/definitions";
import type { ScalpingAnalysisResult, ScalpingAnalysisError } from "@/app/api/scalping/analyze/route";

const COOLDOWN_MS = 2 * 60 * 1000; // 2 min client-side cooldown

const cacheBySymbol = new Map<string, { data: ScalpingAnalysisResult; at: number }>();

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
        <span
          key={i}
          className={cn("text-[10px]", i < value ? "text-amber-400" : "text-muted-foreground/25")}
        >
          ★
        </span>
      ))}
    </div>
  );
}

type ConfirmView = "idle" | "form" | "submitting" | "done" | "error";

function AnalysisCard({
  result,
  t,
}: {
  result: ScalpingAnalysisResult;
  t: ReturnType<typeof useTranslations<"scalping">>;
}) {
  const isLong = result.direction === "LONG";
  const dec = priceDecimals(result.price);
  const [view, setView] = useState<ConfirmView>("idle");
  const [lotSize, setLotSize] = useState("0.01");
  const [signalId, setSignalId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const SCALP_TIMEFRAMES = ["M1", "M5", "M15", "H1"];

  function handleConfirm() {
    const lot = parseFloat(lotSize);
    setView("submitting");
    startTransition(async () => {
      const res = await confirmScalpingPick({
        symbol: result.symbol,
        direction: result.direction,
        entry: result.entry,
        stopLoss: result.stopLoss,
        takeProfit: result.takeProfit,
        confidence: result.confidence,
        qualityScore: result.qualityScore,
        reasoning: result.reasoning,
        checklist: result.checklist,
        lotSize: lot > 0 ? lot : undefined,
      });
      if (res.ok && res.signalId) {
        setSignalId(res.signalId);
        setView("done");
      } else {
        setErrorMsg(res.error ?? "error");
        setView("error");
      }
    });
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-border/70 bg-card flex flex-col gap-3 p-4 border-l-[3px]",
        isLong ? "border-l-emerald-500" : "border-l-red-500",
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="font-mono font-bold text-base text-foreground">{result.symbol}</span>
          <span className="ml-2 text-xs text-muted-foreground">{result.name}</span>
          {result.spreadPips !== null && (
            <span
              className={cn(
                "ml-2 text-[10px] font-medium rounded px-1 py-0.5",
                result.spreadPips >= 3
                  ? "bg-red-500/10 text-red-500"
                  : result.spreadPips >= 2
                    ? "bg-amber-500/10 text-amber-500"
                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
              )}
            >
              {t("spread")}: {result.spreadPips}p
            </span>
          )}
        </div>
        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-[11px] font-bold shrink-0",
            isLong
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
              : "bg-red-500/15 text-red-500",
          )}
        >
          {isLong ? "▲ LONG" : "▼ SHORT"}
        </span>
      </div>

      {/* Quality + confidence */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{t("quality")}</span>
          <ConfidenceStars value={result.confidence} />
        </div>
        <QualityBar score={result.qualityScore} />
      </div>

      {/* Scalping timeframe alignment */}
      <div className="flex gap-1 flex-wrap">
        {SCALP_TIMEFRAMES.map((tf) => {
          const aligned = result.alignedTimeframes.includes(tf);
          return (
            <span
              key={tf}
              className={cn(
                "text-[10px] font-medium rounded px-1.5 py-0.5",
                aligned
                  ? isLong
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-red-500/10 text-red-500"
                  : "bg-muted/30 text-muted-foreground/40",
              )}
            >
              {tf} {aligned ? "✓" : "–"}
            </span>
          );
        })}
      </div>

      {/* Entry / SL / TP */}
      <div className="grid grid-cols-3 gap-1 text-xs bg-muted/30 rounded p-2">
        <div>
          <div className="text-muted-foreground">{t("entry")}</div>
          <div className="font-mono font-semibold">{result.entry.toFixed(dec)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">SL</div>
          <div className="font-mono font-semibold text-red-500">{result.stopLoss.toFixed(dec)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">TP</div>
          <div className="font-mono font-semibold text-emerald-500">
            {result.takeProfit.toFixed(dec)}
          </div>
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-0.5">
        {result.checklist.map((item, i) => (
          <div key={i} className="flex items-start gap-1.5">
            <span
              className={cn(
                "mt-0.5 text-[10px] font-bold shrink-0",
                item.status === "pass"
                  ? "text-emerald-500"
                  : item.status === "warn"
                    ? "text-amber-500"
                    : "text-red-500",
              )}
            >
              {item.status === "pass" ? "✓" : item.status === "warn" ? "⚠" : "✗"}
            </span>
            <div className="min-w-0">
              <span className="text-[11px] text-foreground font-medium">{item.label}</span>
              <span className="text-[11px] text-muted-foreground ml-1">— {item.detail}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Reasoning */}
      <p className="text-xs text-muted-foreground leading-relaxed">{result.reasoning}</p>

      {/* Chart link + confirm */}
      <div className="mt-auto space-y-2">
        <Link
          href={`/chart?symbol=${result.symbol}`}
          className="text-xs text-primary hover:underline"
        >
          {t("viewChart")} →
        </Link>

        {view === "done" && signalId ? (
          <div className="flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2.5 py-1.5">
            <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              {t("confirmDone")}
            </span>
            <Link
              href={`/signals/${signalId}`}
              className="ml-auto text-xs text-primary hover:underline shrink-0"
            >
              {t("viewSignal")}
            </Link>
          </div>
        ) : view === "error" ? (
          <div className="flex items-center gap-2 rounded-md bg-red-500/10 px-2.5 py-1.5">
            <span className="text-xs text-red-500 flex-1">
              {t(`err_${errorMsg as "unauthorized" | "vip_required" | "rate_limited" | "error"}`)}
            </span>
            <button
              onClick={() => setView("idle")}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {t("retry")}
            </button>
          </div>
        ) : view === "form" || view === "submitting" ? (
          <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/20 px-2.5 py-2">
            <span className="text-xs text-muted-foreground shrink-0">{t("lot")}</span>
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
              {isPending ? <Loader2 className="size-3 animate-spin" /> : t("confirm")}
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
            {t("confirmOpen")} {isLong ? "▲" : "▼"}
          </button>
        )}
      </div>
    </div>
  );
}

type FetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; data: ScalpingAnalysisResult; cachedAt: number }
  | { status: "unavailable" }
  | { status: "error" };

type Props = {
  isLoggedIn: boolean;
  isVip: boolean;
};

export function ScalpingPanel({ isLoggedIn, isVip }: Props) {
  const locale = useLocale();
  const t = useTranslations("scalping");

  const defaultSymbol = "EURUSD";
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [state, setState] = useState<FetchState>({ status: "idle" });
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(id);
  }, []);

  const cachedAt = state.status === "done" ? state.cachedAt : null;
  const remainingMs = cachedAt ? Math.max(0, COOLDOWN_MS - (now - cachedAt)) : 0;
  const canAnalyze = state.status !== "loading" && remainingMs <= 0;

  function handleAnalyze() {
    if (!isVip || !canAnalyze) return;

    // Check in-memory cache first
    const cached = cacheBySymbol.get(`${symbol}:${locale}`);
    if (cached && Date.now() - cached.at < COOLDOWN_MS) {
      setState({ status: "done", data: cached.data, cachedAt: cached.at });
      return;
    }

    setState({ status: "loading" });

    fetch(`/api/scalping/analyze?symbol=${symbol}&locale=${locale}`)
      .then(async (res) => {
        if (res.status === 503) {
          const body = (await res.json()) as ScalpingAnalysisError;
          if (body.error === "ai_unavailable") throw new Error("unavailable");
        }
        if (!res.ok) throw new Error("error");
        return res.json() as Promise<ScalpingAnalysisResult>;
      })
      .then((data) => {
        const now = Date.now();
        cacheBySymbol.set(`${symbol}:${locale}`, { data, at: now });
        setState({ status: "done", data, cachedAt: now });
      })
      .catch((err) =>
        setState({ status: err.message === "unavailable" ? "unavailable" : "error" }),
      );
  }

  // --- Not logged in ---
  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/10 p-4">
        <div className="flex items-center gap-2.5">
          <Zap className="size-4 text-primary/60 shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">{t("title")}</p>
            <p className="text-xs text-muted-foreground">{t("loginHint")}</p>
          </div>
        </div>
        <Link
          href="/auth/signin"
          className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition"
        >
          {t("login")}
        </Link>
      </div>
    );
  }

  // --- Not VIP ---
  if (!isVip) {
    return (
      <div className="flex items-center justify-between gap-4 rounded-lg border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 p-4">
        <div className="flex items-center gap-2.5">
          <Crown className="size-4 text-amber-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">{t("title")}</p>
            <p className="text-xs text-amber-700 dark:text-amber-300/70">{t("vipHint")}</p>
          </div>
        </div>
        <Link
          href="/profile"
          className="shrink-0 rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition"
        >
          {t("upgrade")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Symbol selector + analyze button */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <select
            value={symbol}
            onChange={(e) => {
              setSymbol(e.target.value);
              setState({ status: "idle" });
            }}
            className="appearance-none h-9 rounded-md border border-input bg-background pl-3 pr-8 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
          >
            {QUOTE_DEFINITIONS.map((def) => (
              <option key={def.symbol} value={def.symbol}>
                {def.symbol} — {def.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        </div>

        <button
          onClick={handleAnalyze}
          disabled={!canAnalyze}
          className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          {state.status === "loading" ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              {t("analyzing")}
            </>
          ) : (
            <>
              <Zap className="size-3.5" />
              {t("analyze")}
            </>
          )}
        </button>

        {remainingMs > 0 && (
          <span className="text-xs text-muted-foreground">
            {t("cooldown", { time: Math.ceil(remainingMs / 1000) + "s" })}
          </span>
        )}

        <div className="ml-auto flex gap-1">
          {["M1", "M5", "M15", "H1"].map((tf) => (
            <span
              key={tf}
              className="text-[10px] font-medium rounded px-1.5 py-0.5 bg-muted/50 text-muted-foreground"
            >
              {tf}
            </span>
          ))}
        </div>
      </div>

      {/* Loading skeleton */}
      {state.status === "loading" && (
        <div className="rounded-lg border border-border/40 bg-muted/20 h-72 animate-pulse" />
      )}

      {/* Unavailable */}
      {state.status === "unavailable" && (
        <div className="rounded-lg border border-border/60 bg-muted/10 p-4">
          <p className="text-xs text-muted-foreground">{t("unavailable")}</p>
        </div>
      )}

      {/* Error */}
      {state.status === "error" && (
        <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/10 p-4">
          <p className="text-xs text-muted-foreground">{t("errorMsg")}</p>
          <button onClick={handleAnalyze} className="text-xs text-primary hover:underline">
            {t("retry")}
          </button>
        </div>
      )}

      {/* Result */}
      {state.status === "done" && (
        <AnalysisCard result={state.data} t={t} />
      )}

      <p className="text-xs text-muted-foreground/50">{t("disclaimer")}</p>
    </div>
  );
}
