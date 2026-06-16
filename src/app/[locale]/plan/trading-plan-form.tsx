"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { saveDailyTradingPlan } from "@/actions/trading-plan";
import { ImageLightbox } from "@/components/signals/signal-image-gallery";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { effectiveImageMime, SIGNAL_IMAGE_LIMITS } from "@/lib/signal-images";
import { cn } from "@/lib/utils";

const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

const MAX_SYMBOL_PLANS = 12;

type TradingPlanBias = "BULLISH" | "BEARISH" | "RANGE" | "WAIT";

export type TradingPlanSymbolPlan = {
  id: string;
  symbol: string;
  bias: TradingPlanBias;
  keyLevels: string | null;
  newsToAvoid: string | null;
  notes: string | null;
};

export type TradingPlanFormValue = {
  planDate: string;
  watchedSymbols: string[];
  symbolPlans: TradingPlanSymbolPlan[];
  bias: TradingPlanBias;
  chartImageUrls: string[];
  keyLevels: string | null;
  newsToAvoid: string | null;
  maxRiskPercent: number | null;
  maxTrades: number | null;
  sessionFocus: string | null;
  notes: string | null;
  checkedNews: boolean;
  checkedLevels: boolean;
  checkedRisk: boolean;
  checkedEmotion: boolean;
  checkedJournal: boolean;
  completedAt: string | null;
};

type Props = {
  plan: TradingPlanFormValue;
};

const checklistKeys = [
  "checkedNews",
  "checkedLevels",
  "checkedRisk",
  "checkedEmotion",
  "checkedJournal",
] as const;

type PendingSlot = { id: string; previewUrl: string };

function createBlankSymbolPlan(id = "symbol-1"): TradingPlanSymbolPlan {
  return {
    id,
    symbol: "",
    bias: "WAIT",
    keyLevels: null,
    newsToAvoid: null,
    notes: null,
  };
}

function normalizeSymbol(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9._:-]/g, "");
}

function symbolPlansFromPlan(plan: TradingPlanFormValue): TradingPlanSymbolPlan[] {
  if (plan.symbolPlans.length > 0) return plan.symbolPlans;
  if (plan.watchedSymbols.length > 0) {
    return plan.watchedSymbols.map((symbol) => ({
      id: symbol,
      symbol,
      bias: plan.bias,
      keyLevels: plan.keyLevels,
      newsToAvoid: plan.newsToAvoid,
      notes: null,
    }));
  }
  return [createBlankSymbolPlan()];
}

function hasPlanContent(plan: TradingPlanFormValue) {
  return (
    plan.watchedSymbols.length > 0 ||
    plan.symbolPlans.length > 0 ||
    plan.chartImageUrls.length > 0 ||
    plan.keyLevels ||
    plan.newsToAvoid ||
    plan.maxRiskPercent !== null ||
    plan.maxTrades !== null ||
    plan.sessionFocus ||
    plan.notes ||
    checklistKeys.some((key) => plan[key])
  );
}

function valueOrDash(value: string | number | null | undefined) {
  return value === null || value === undefined || value === "" ? "—" : value;
}

function planFromFormData(formData: FormData): TradingPlanFormValue {
  const symbolPlans = parseSymbolPlansJson(String(formData.get("symbolPlans") ?? "[]"));
  const watchedSymbols = symbolPlans.map((item) => item.symbol);
  const maxRiskRaw = formData.get("maxRiskPercent");
  const maxTradesRaw = formData.get("maxTrades");
  const checkedNews = formData.get("checkedNews") === "on";
  const checkedLevels = formData.get("checkedLevels") === "on";
  const checkedRisk = formData.get("checkedRisk") === "on";
  const checkedEmotion = formData.get("checkedEmotion") === "on";
  const checkedJournal = formData.get("checkedJournal") === "on";

  return {
    planDate: String(formData.get("planDate") ?? ""),
    watchedSymbols,
    symbolPlans,
    bias: (formData.get("bias") || "WAIT") as TradingPlanFormValue["bias"],
    chartImageUrls: formData.getAll("imageUrls").filter((url): url is string => typeof url === "string"),
    keyLevels: String(formData.get("keyLevels") ?? "").trim() || null,
    newsToAvoid: String(formData.get("newsToAvoid") ?? "").trim() || null,
    maxRiskPercent:
      maxRiskRaw === null || maxRiskRaw === "" ? null : Number(maxRiskRaw),
    maxTrades:
      maxTradesRaw === null || maxTradesRaw === "" ? null : Number(maxTradesRaw),
    sessionFocus: String(formData.get("sessionFocus") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
    checkedNews,
    checkedLevels,
    checkedRisk,
    checkedEmotion,
    checkedJournal,
    completedAt:
      checkedNews && checkedLevels && checkedRisk && checkedEmotion && checkedJournal
        ? new Date().toISOString()
        : null,
  };
}

function parseSymbolPlansJson(value: string): TradingPlanSymbolPlan[] {
  let raw: unknown;
  try {
    raw = JSON.parse(value);
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const plans: TradingPlanSymbolPlan[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const symbol = normalizeSymbol(String(record.symbol ?? ""));
    if (!symbol || seen.has(symbol)) continue;
    const bias = record.bias;
    seen.add(symbol);
    plans.push({
      id: typeof record.id === "string" ? record.id : symbol,
      symbol,
      bias:
        bias === "BULLISH" || bias === "BEARISH" || bias === "RANGE" || bias === "WAIT"
          ? bias
          : "WAIT",
      keyLevels: typeof record.keyLevels === "string" && record.keyLevels.trim() ? record.keyLevels.trim() : null,
      newsToAvoid: typeof record.newsToAvoid === "string" && record.newsToAvoid.trim() ? record.newsToAvoid.trim() : null,
      notes: typeof record.notes === "string" && record.notes.trim() ? record.notes.trim() : null,
    });
    if (plans.length >= MAX_SYMBOL_PLANS) break;
  }
  return plans;
}

function FieldSupportLink({
  href,
  label,
}: {
  href: "/calendar" | "/chart" | "/tools";
  label: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
    >
      {label}
      <ExternalLink className="size-3" aria-hidden />
    </Link>
  );
}

export function TradingPlanForm({ plan }: Props) {
  const t = useTranslations("tradingPlan");
  const tc = useTranslations("common");
  const pathname = usePathname();
  const [state, formAction, isPending] = useActionState(saveDailyTradingPlan, null);
  const [readPlan, setReadPlan] = useState(plan);
  const [pendingReadPlan, setPendingReadPlan] = useState<TradingPlanFormValue | null>(null);
  const [isEditing, setIsEditing] = useState(() => !hasPlanContent(plan));
  const [uploadedUrls, setUploadedUrls] = useState<string[]>(plan.chartImageUrls);
  const [pendingSlots, setPendingSlots] = useState<PendingSlot[]>([]);
  const [symbolPlans, setSymbolPlans] = useState(() => symbolPlansFromPlan(plan));
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [checklist, setChecklist] = useState(
    () => Object.fromEntries(checklistKeys.map((key) => [key, plan[key]])) as Record<
      (typeof checklistKeys)[number],
      boolean
    >,
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadNeedsSignIn, setUploadNeedsSignIn] = useState(false);
  const completedCount = checklistKeys.filter((key) => checklist[key]).length;
  const progressPercent = Math.round((completedCount / checklistKeys.length) * 100);
  const readCompletedCount = checklistKeys.filter((key) => readPlan[key]).length;
  const readProgressPercent = Math.round(
    (readCompletedCount / checklistKeys.length) * 100,
  );
  const biasLabel = {
    WAIT: t("biasWait"),
    BULLISH: t("biasBullish"),
    BEARISH: t("biasBearish"),
    RANGE: t("biasRange"),
  } satisfies Record<TradingPlanFormValue["bias"], string>;

  useEffect(() => {
    if (state?.ok) {
      setHasUnsavedChanges(false);
      setReadPlan(pendingReadPlan ?? plan);
      setIsEditing(false);
    }
  }, [pendingReadPlan, plan, state?.ok]);

  const signInForUploadHref = `/auth/signin?callbackUrl=${encodeURIComponent(
    pathname?.startsWith("/") ? pathname : "/plan",
  )}`;
  const serializedSymbolPlans = JSON.stringify(
    symbolPlans
      .map((item) => ({
        ...item,
        symbol: normalizeSymbol(item.symbol),
      }))
      .filter((item) => item.symbol),
  );
  const watchedSymbolsValue = symbolPlans
    .map((item) => normalizeSymbol(item.symbol))
    .filter(Boolean)
    .join(", ");

  const updateSymbolPlan = useCallback(
    (id: string, patch: Partial<TradingPlanSymbolPlan>) => {
      setSymbolPlans((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      );
      setHasUnsavedChanges(true);
    },
    [],
  );

  const addSymbolPlan = useCallback(() => {
    setSymbolPlans((prev) =>
      prev.length >= MAX_SYMBOL_PLANS
        ? prev
        : [...prev, createBlankSymbolPlan(crypto.randomUUID())],
    );
    setHasUnsavedChanges(true);
  }, []);

  const removeSymbolPlan = useCallback((id: string) => {
    setSymbolPlans((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((item) => item.id !== id);
    });
    setHasUnsavedChanges(true);
  }, []);

  const removeUrl = useCallback((url: string) => {
    setUploadedUrls((prev) => prev.filter((u) => u !== url));
    setHasUnsavedChanges(true);
  }, []);

  const revokeAndRemoveSlot = useCallback((slot: PendingSlot) => {
    URL.revokeObjectURL(slot.previewUrl);
    setPendingSlots((prev) => prev.filter((s) => s.id !== slot.id));
  }, []);

  const revokeBatchFromIndex = useCallback((batch: PendingSlot[], fromIndex: number) => {
    for (let j = fromIndex; j < batch.length; j++) {
      URL.revokeObjectURL(batch[j].previewUrl);
    }
    const drop = new Set(batch.slice(fromIndex).map((s) => s.id));
    setPendingSlots((prev) => prev.filter((s) => !drop.has(s.id)));
  }, []);

  const onPickFiles = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const picked = e.target.files;
      const snapshot = picked?.length ? Array.from(picked) : [];
      e.target.value = "";
      if (snapshot.length === 0) return;

      setUploadError(null);
      setUploadNeedsSignIn(false);
      setHasUnsavedChanges(true);
      const remaining =
        SIGNAL_IMAGE_LIMITS.MAX_IMAGES - uploadedUrls.length - pendingSlots.length;
      if (remaining <= 0) return;

      const rawList = snapshot.slice(0, remaining);
      const valid: File[] = [];
      for (const file of rawList) {
        if (!effectiveImageMime(file)) {
          setUploadError(t("imageInvalidType"));
          return;
        }
        if (file.size > SIGNAL_IMAGE_LIMITS.MAX_BYTES) {
          setUploadError(t("imageTooLarge"));
          return;
        }
        valid.push(file);
      }
      if (valid.length === 0) return;

      const batch: PendingSlot[] = valid.map((file) => ({
        id: crypto.randomUUID(),
        previewUrl: URL.createObjectURL(file),
      }));
      setPendingSlots((prev) => [...prev, ...batch]);
      setUploading(true);

      try {
        for (let i = 0; i < valid.length; i++) {
          const file = valid[i];
          const slot = batch[i];
          const fd = new FormData();
          fd.append("file", file);

          const res = await fetch(
            new URL("/api/signal-images/upload", window.location.origin).toString(),
            {
              method: "POST",
              body: fd,
              credentials: "include",
            },
          );

          let data: { url?: string; error?: string; message?: string } = {};
          try {
            data = (await res.json()) as typeof data;
          } catch {
            /* non-JSON response */
          }

          if (res.status === 401) {
            setUploadNeedsSignIn(true);
            setUploadError(t("imageUploadNeedLogin"));
            revokeBatchFromIndex(batch, i);
            break;
          }

          if (res.status === 503 && data.error === "not_configured") {
            setUploadNeedsSignIn(false);
            setUploadError(t("imagesNotConfigured"));
            revokeBatchFromIndex(batch, i);
            break;
          }

          if (!res.ok) {
            setUploadNeedsSignIn(false);
            const hint =
              data.message ??
              (data.error === "rate_limited"
                ? t("imageUploadRateLimited")
                : null) ??
              data.error ??
              t("imageUploadFailed");
            setUploadError(hint);
            revokeBatchFromIndex(batch, i);
            break;
          }

          if (data.url) {
            setUploadedUrls((prev) =>
              [...prev, data.url!].slice(0, SIGNAL_IMAGE_LIMITS.MAX_IMAGES),
            );
          }
          revokeAndRemoveSlot(slot);
        }
      } catch {
        setUploadNeedsSignIn(false);
        setUploadError(t("imageUploadFailed"));
        setPendingSlots((prev) => {
          const batchIds = new Set(batch.map((b) => b.id));
          return prev.filter((slot) => {
            if (batchIds.has(slot.id)) {
              URL.revokeObjectURL(slot.previewUrl);
              return false;
            }
            return true;
          });
        });
      } finally {
        setUploading(false);
      }
    },
    [
      uploadedUrls.length,
      pendingSlots.length,
      t,
      revokeAndRemoveSlot,
      revokeBatchFromIndex,
    ],
  );

  const fileInputClass = cn(
    "h-8 max-w-xs min-w-0 cursor-pointer rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none file:mr-2 file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30",
    uploading ||
      uploadedUrls.length + pendingSlots.length >= SIGNAL_IMAGE_LIMITS.MAX_IMAGES
      ? "pointer-events-none opacity-50"
      : null,
  );

  if (!isEditing) {
    return (
      <div className="space-y-5">
        {state?.ok ? <p className="text-sm text-primary">{t("saved")}</p> : null}

        <Card className="border-border/70 bg-card/65">
          <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarClock className="size-4 text-primary" aria-hidden />
                {t("summaryTitle")}
              </CardTitle>
              <CardDescription className="mt-1">
                {t("summaryDesc")}
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="mr-2 size-4" aria-hidden />
              {t("editPlan")}
            </Button>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-border/60 bg-background/45 p-3">
                <p className="text-xs text-muted-foreground">{t("planDate")}</p>
                <p className="mt-1 font-mono text-sm font-medium text-foreground">
                  {readPlan.planDate}
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/45 p-3">
                <p className="text-xs text-muted-foreground">{t("bias")}</p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {biasLabel[readPlan.bias]}
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/45 p-3">
                <p className="text-xs text-muted-foreground">{t("maxRiskPercent")}</p>
                <p className="mt-1 font-mono text-sm font-medium text-foreground">
                  {readPlan.maxRiskPercent === null ? "—" : `${readPlan.maxRiskPercent}%`}
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/45 p-3">
                <p className="text-xs text-muted-foreground">{t("maxTrades")}</p>
                <p className="mt-1 font-mono text-sm font-medium text-foreground">
                  {valueOrDash(readPlan.maxTrades)}
                </p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.42fr)]">
              <div className="space-y-4">
                <section className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-medium text-foreground">
                      {t("symbolPlansTitle")}
                    </h3>
                    <Badge variant="outline">
                      {t("symbolCount", { count: readPlan.symbolPlans.length })}
                    </Badge>
                  </div>
                  {readPlan.symbolPlans.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-lg border border-border/60 bg-background/35 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-mono text-base font-semibold text-foreground">
                          {item.symbol}
                        </h4>
                        <Badge variant="outline">{biasLabel[item.bias]}</Badge>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-3">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">
                            {t("keyLevels")}
                          </p>
                          <p className="mt-1 whitespace-pre-line text-sm leading-6 text-foreground">
                            {valueOrDash(item.keyLevels)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">
                            {t("newsToAvoid")}
                          </p>
                          <p className="mt-1 whitespace-pre-line text-sm leading-6 text-foreground">
                            {valueOrDash(item.newsToAvoid)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">
                            {t("notes")}
                          </p>
                          <p className="mt-1 whitespace-pre-line text-sm leading-6 text-foreground">
                            {valueOrDash(item.notes)}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}
                </section>
                <section className="rounded-lg border border-border/60 bg-background/35 p-4">
                  <h3 className="text-sm font-medium text-foreground">
                    {t("sessionFocus")}
                  </h3>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">
                    {valueOrDash(readPlan.sessionFocus)}
                  </p>
                </section>
                <section className="rounded-lg border border-border/60 bg-background/35 p-4">
                  <h3 className="text-sm font-medium text-foreground">
                    {t("keyLevels")}
                  </h3>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">
                    {valueOrDash(readPlan.keyLevels)}
                  </p>
                </section>
                <section className="rounded-lg border border-border/60 bg-background/35 p-4">
                  <h3 className="text-sm font-medium text-foreground">
                    {t("newsToAvoid")}
                  </h3>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">
                    {valueOrDash(readPlan.newsToAvoid)}
                  </p>
                </section>
                {readPlan.notes ? (
                  <section className="rounded-lg border border-border/60 bg-background/35 p-4">
                    <h3 className="text-sm font-medium text-foreground">
                      {t("notes")}
                    </h3>
                    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">
                      {readPlan.notes}
                    </p>
                  </section>
                ) : null}
              </div>

              <aside className="space-y-4">
                <section className="rounded-lg border border-border/70 bg-muted/15 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-medium text-foreground">
                      {t("checklistTitle")}
                    </h3>
                    <Badge
                      variant={
                        readCompletedCount === checklistKeys.length
                          ? "default"
                          : "outline"
                      }
                    >
                      {t("progress", {
                        count: readCompletedCount,
                        total: checklistKeys.length,
                      })}
                    </Badge>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${readProgressPercent}%` }}
                    />
                  </div>
                  <ul className="mt-4 space-y-2">
                    {checklistKeys.map((key) => (
                      <li
                        key={key}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <CheckCircle2
                          className={cn(
                            "mt-0.5 size-4 shrink-0",
                            readPlan[key] ? "text-primary" : "text-muted-foreground/45",
                          )}
                          aria-hidden
                        />
                        <span className={readPlan[key] ? "text-foreground" : undefined}>
                          {t(`${key}Title`)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>

                {readPlan.chartImageUrls.length > 0 ? (
                  <section className="space-y-2">
                    <h3 className="text-sm font-medium text-foreground">
                      {t("chartImages")}
                    </h3>
                    <ul className="grid grid-cols-2 gap-2">
                      {readPlan.chartImageUrls.map((url) => (
                        <li
                          key={url}
                          className="overflow-hidden rounded-md border border-border/60"
                        >
                          <button
                            type="button"
                            onClick={() => setLightboxUrl(url)}
                            className="block w-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element -- remote blob URLs */}
                            <img
                              src={url}
                              alt=""
                              className="aspect-video w-full object-cover"
                            />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
              </aside>
            </div>
          </CardContent>
        </Card>
        {lightboxUrl ? (
          <ImageLightbox
            url={lightboxUrl}
            onClose={() => setLightboxUrl(null)}
            dialogLabel={t("chartImages")}
            closeLabel={tc("close")}
          />
        ) : null}
      </div>
    );
  }

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        setPendingReadPlan(planFromFormData(new FormData(event.currentTarget)));
      }}
      onChange={() => setHasUnsavedChanges(true)}
      className="space-y-5 pb-24 sm:pb-0"
    >
      {uploadedUrls.map((url) => (
        <input key={url} type="hidden" name="imageUrls" value={url} />
      ))}
      <input type="hidden" name="watchedSymbols" value={watchedSymbolsValue} />
      <input type="hidden" name="symbolPlans" value={serializedSymbolPlans} />
      <input
        type="hidden"
        name="bias"
        value={symbolPlans.find((item) => normalizeSymbol(item.symbol))?.bias ?? readPlan.bias}
      />

      <Card className="border-border/70 bg-card/65">
        <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="size-4 text-primary" aria-hidden />
              {t("planCardTitle")}
            </CardTitle>
            <CardDescription className="mt-1">
              {t("planCardDesc")}
            </CardDescription>
          </div>
          {readPlan.completedAt ? (
            <Badge className="w-fit bg-primary/20 text-primary hover:bg-primary/25">
              <CheckCircle2 className="mr-1 size-3.5" aria-hidden />
              {t("completed")}
            </Badge>
          ) : (
            <Badge variant="outline" className="w-fit border-border text-muted-foreground">
              {t("progress", { count: completedCount, total: checklistKeys.length })}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-3">
          <div>
            <Label htmlFor="planDate">{t("planDate")}</Label>
            <Input
              id="planDate"
              name="planDate"
              type="date"
              required
              defaultValue={readPlan.planDate}
              className="mt-1.5"
            />
          </div>
          <div>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="maxRiskPercent">{t("maxRiskPercent")}</Label>
              <FieldSupportLink href="/tools" label={t("supportTools")} />
            </div>
            <Input
              id="maxRiskPercent"
              name="maxRiskPercent"
              type="number"
              min="0"
              max="100"
              step="0.1"
              defaultValue={readPlan.maxRiskPercent ?? ""}
              placeholder="1"
              className="mt-1.5 font-mono"
            />
          </div>
          <div>
            <Label htmlFor="maxTrades">{t("maxTrades")}</Label>
            <Input
              id="maxTrades"
              name="maxTrades"
              type="number"
              min="1"
              max="99"
              step="1"
              defaultValue={readPlan.maxTrades ?? ""}
              placeholder="2"
              className="mt-1.5 font-mono"
            />
          </div>
          <div className="lg:col-span-3">
            <Label htmlFor="sessionFocus">{t("sessionFocus")}</Label>
            <Input
              id="sessionFocus"
              name="sessionFocus"
              defaultValue={readPlan.sessionFocus ?? ""}
              placeholder={t("sessionFocusPlaceholder")}
              className="mt-1.5"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/60">
        <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base">{t("symbolPlansTitle")}</CardTitle>
            <CardDescription className="mt-1">
              {t("symbolPlansDesc")}
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addSymbolPlan}
            disabled={symbolPlans.length >= MAX_SYMBOL_PLANS}
          >
            <Plus className="mr-2 size-4" aria-hidden />
            {t("addSymbolPlan")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {symbolPlans.map((item, index) => (
            <div
              key={item.id}
              className="rounded-lg border border-border/60 bg-background/35 p-4"
            >
              <div className="grid gap-3 md:grid-cols-[minmax(120px,0.5fr)_minmax(140px,0.5fr)_auto] md:items-end">
                <div>
                  <Label htmlFor={`symbol-${item.id}`}>{t("symbol")}</Label>
                  <Input
                    id={`symbol-${item.id}`}
                    value={item.symbol}
                    onChange={(event) =>
                      updateSymbolPlan(item.id, {
                        symbol: normalizeSymbol(event.target.value),
                      })
                    }
                    placeholder={index === 0 ? "XAUUSD" : "EURUSD"}
                    className="mt-1.5 font-mono uppercase"
                  />
                </div>
                <div>
                  <Label htmlFor={`bias-${item.id}`}>{t("bias")}</Label>
                  <select
                    id={`bias-${item.id}`}
                    value={item.bias}
                    onChange={(event) =>
                      updateSymbolPlan(item.id, {
                        bias: event.target.value as TradingPlanBias,
                      })
                    }
                    className={`mt-1.5 ${SELECT_CLASS}`}
                  >
                    <option value="WAIT">{t("biasWait")}</option>
                    <option value="BULLISH">{t("biasBullish")}</option>
                    <option value="BEARISH">{t("biasBearish")}</option>
                    <option value="RANGE">{t("biasRange")}</option>
                  </select>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeSymbolPlan(item.id)}
                  disabled={symbolPlans.length <= 1}
                  aria-label={t("removeSymbolPlan")}
                  className="justify-self-start text-muted-foreground hover:text-destructive md:justify-self-end"
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                <div>
                  <Label htmlFor={`levels-${item.id}`}>{t("keyLevels")}</Label>
                  <Textarea
                    id={`levels-${item.id}`}
                    value={item.keyLevels ?? ""}
                    onChange={(event) =>
                      updateSymbolPlan(item.id, { keyLevels: event.target.value })
                    }
                    rows={4}
                    placeholder={t("keyLevelsPlaceholder")}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor={`news-${item.id}`}>{t("newsToAvoid")}</Label>
                  <Textarea
                    id={`news-${item.id}`}
                    value={item.newsToAvoid ?? ""}
                    onChange={(event) =>
                      updateSymbolPlan(item.id, { newsToAvoid: event.target.value })
                    }
                    rows={4}
                    placeholder={t("newsPlaceholder")}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor={`notes-${item.id}`}>{t("notes")}</Label>
                  <Textarea
                    id={`notes-${item.id}`}
                    value={item.notes ?? ""}
                    onChange={(event) =>
                      updateSymbolPlan(item.id, { notes: event.target.value })
                    }
                    rows={4}
                    placeholder={t("notesPlaceholder")}
                    className="mt-1.5"
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.42fr)]">
        <Card className="border-border/70 bg-card/55">
          <CardHeader>
            <CardTitle className="text-base">{t("contextTitle")}</CardTitle>
            <CardDescription>{t("contextDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="keyLevels">{t("keyLevels")}</Label>
                <FieldSupportLink href="/chart" label={t("supportChart")} />
              </div>
              <Textarea
                id="keyLevels"
                name="keyLevels"
                rows={5}
                defaultValue={readPlan.keyLevels ?? ""}
                placeholder={t("keyLevelsPlaceholder")}
                className="mt-1.5"
              />
            </div>
            <div>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="chartImages">{t("chartImages")}</Label>
                <FieldSupportLink href="/chart" label={t("supportChart")} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("chartImagesHint")}
              </p>
              <div className="mt-2">
                <input
                  id="chartImages"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                  multiple
                  disabled={
                    uploading ||
                    uploadedUrls.length + pendingSlots.length >=
                      SIGNAL_IMAGE_LIMITS.MAX_IMAGES
                  }
                  onChange={onPickFiles}
                  className={fileInputClass}
                />
              </div>
              {uploadError ? (
                <p className="mt-2 text-sm text-destructive">
                  {uploadError}
                  {uploadNeedsSignIn ? (
                    <>
                      {" "}
                      <Link
                        href={signInForUploadHref}
                        className="font-medium underline underline-offset-2 hover:text-destructive/90"
                      >
                        {t("imageUploadSignInLink")}
                      </Link>
                    </>
                  ) : null}
                </p>
              ) : null}
              {(uploadedUrls.length > 0 || pendingSlots.length > 0) ? (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {uploadedUrls.map((url) => (
                    <li
                      key={url}
                      className="relative inline-block rounded-md border border-border/60"
                    >
                      <button
                        type="button"
                        onClick={() => setLightboxUrl(url)}
                        className="block cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- remote blob URLs */}
                        <img
                          src={url}
                          alt=""
                          className="h-20 max-w-[140px] rounded-md object-cover"
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeUrl(url)}
                        className="absolute -right-1.5 -top-1.5 flex size-6 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow hover:bg-destructive hover:text-destructive-foreground"
                        aria-label={t("removeImage")}
                      >
                        <X className="size-3.5" aria-hidden />
                      </button>
                    </li>
                  ))}
                  {pendingSlots.map((slot) => (
                    <li
                      key={slot.id}
                      className="relative inline-block overflow-hidden rounded-md border border-primary/30 ring-2 ring-primary/20"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={slot.previewUrl}
                        alt=""
                        className="h-20 max-w-[140px] rounded-md object-cover opacity-90"
                      />
                      <div
                        className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-background/55 backdrop-blur-[2px]"
                        aria-live="polite"
                        aria-busy="true"
                      >
                        <Loader2 className="size-5 animate-spin text-primary" />
                        <span className="max-w-[110px] truncate px-1 text-center text-[10px] font-medium text-foreground">
                          {t("imagesUploading")}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <div>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="newsToAvoid">{t("newsToAvoid")}</Label>
                <FieldSupportLink href="/calendar" label={t("supportCalendar")} />
              </div>
              <Textarea
                id="newsToAvoid"
                name="newsToAvoid"
                rows={4}
                defaultValue={readPlan.newsToAvoid ?? ""}
                placeholder={t("newsPlaceholder")}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="notes">{t("notes")}</Label>
              <Textarea
                id="notes"
                name="notes"
                rows={4}
                defaultValue={readPlan.notes ?? ""}
                placeholder={t("notesPlaceholder")}
                className="mt-1.5"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-muted/15">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">{t("checklistTitle")}</CardTitle>
                <CardDescription className="mt-1">
                  {t("checklistDesc")}
                </CardDescription>
              </div>
              <Badge
                variant={completedCount === checklistKeys.length ? "default" : "outline"}
                className="shrink-0"
              >
                {t("progress", { count: completedCount, total: checklistKeys.length })}
              </Badge>
            </div>
            <div
              className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"
              aria-hidden
            >
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {checklistKeys.map((key) => (
              <label
                key={key}
                className={cn(
                  "flex gap-3 rounded-md border border-border/70 bg-background/55 px-3 py-3 text-sm transition hover:border-primary/30",
                  checklist[key] && "border-primary/25 bg-primary/8",
                )}
              >
                <input
                  type="checkbox"
                  name={key}
                  checked={checklist[key]}
                  onChange={(event) => {
                    setChecklist((prev) => ({ ...prev, [key]: event.target.checked }));
                    setHasUnsavedChanges(true);
                  }}
                  className="mt-0.5 size-4 rounded border-border accent-primary"
                />
                <span>
                  <span className="block font-medium text-foreground">
                    {t(`${key}Title`)}
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                    {t(`${key}Desc`)}
                  </span>
                </span>
              </label>
            ))}
          </CardContent>
        </Card>
      </div>

      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {hasUnsavedChanges ? (
        <p className="text-sm text-amber-300">{t("unsavedChanges")}</p>
      ) : state?.ok ? (
        <p className="text-sm text-primary">{t("saved")}</p>
      ) : null}

      <div className="hidden justify-end sm:flex">
        <Button type="submit" disabled={isPending || uploading}>
          <Save className="mr-2 size-4" aria-hidden />
          {isPending ? tc("loading") : tc("save")}
        </Button>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 p-3 shadow-lg backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {t("progress", { count: completedCount, total: checklistKeys.length })}
            </p>
            <p
              className={cn(
                "truncate text-xs",
                hasUnsavedChanges ? "text-amber-300" : "text-muted-foreground",
              )}
            >
              {hasUnsavedChanges ? t("unsavedChanges") : state?.ok ? t("saved") : t("readyToSave")}
            </p>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          <Button type="submit" disabled={isPending || uploading} className="min-w-24">
            <Save className="mr-2 size-4" aria-hidden />
            {isPending ? tc("loading") : tc("save")}
          </Button>
        </div>
      </div>
      {lightboxUrl ? (
        <ImageLightbox
          url={lightboxUrl}
          onClose={() => setLightboxUrl(null)}
          dialogLabel={t("chartImages")}
          closeLabel={tc("close")}
        />
      ) : null}
    </form>
  );
}
