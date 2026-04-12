"use client";

import { useActionState, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ThumbsDown, MessageCircle, ThumbsUp } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { closeSignal } from "@/actions/signals";
import { SignalCreateForm } from "@/components/signals/signal-create-form";
import { SignalImageGallery } from "@/components/signals/signal-image-gallery";
import { EmptyState } from "@/components/layout/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type SignalRow = {
  id: string;
  symbol: string;
  direction: string;
  entry: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  tier: "FREE" | "VIP";
  status: "ACTIVE" | "CLOSED_WIN" | "CLOSED_LOSS" | "CANCELLED";
  notes: string | null;
  masked: boolean;
  authorLabel: string;
  authorId: string;
  isAuthor: boolean;
  likes: number;
  dislikes: number;
  commentCount: number;
  imageUrls: string[];
  imageCount: number;
  createdAt: string;
};

const closeInitial: { error?: string; ok?: boolean } | null = null;

function statusLabel(
  status: SignalRow["status"],
  t: (key: string) => string,
): string {
  switch (status) {
    case "ACTIVE":
      return t("statusActive");
    case "CLOSED_WIN":
      return t("statusClosedWin");
    case "CLOSED_LOSS":
      return t("statusClosedLoss");
    case "CANCELLED":
      return t("statusCancelled");
    default:
      return status;
  }
}

function statusBadgeClass(status: SignalRow["status"]): string {
  switch (status) {
    case "ACTIVE":
      return "border-emerald-500/40 bg-emerald-500/15 text-emerald-200";
    case "CLOSED_WIN":
      return "border-sky-500/40 bg-sky-500/15 text-sky-200";
    case "CLOSED_LOSS":
      return "border-destructive/40 bg-destructive/15 text-red-300";
    case "CANCELLED":
      return "border-muted-foreground/35 bg-muted/40 text-muted-foreground";
    default:
      return "";
  }
}

const toolbarSelectClass =
  "mt-1 h-9 w-full min-w-[10rem] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:w-auto";

export function SignalRoom({
  signals,
  showCreate,
}: {
  signals: SignalRow[];
  showCreate: boolean;
}) {
  const t = useTranslations("signals");
  const tn = useTranslations("nav");
  const tc = useTranslations("common");

  const [tierFilter, setTierFilter] = useState<"all" | "FREE" | "VIP">("all");
  const [symbolQuery, setSymbolQuery] = useState("");

  const filtered = useMemo(() => {
    const q = symbolQuery.trim().toUpperCase();
    return signals.filter((s) => {
      if (tierFilter !== "all" && s.tier !== tierFilter) return false;
      if (q && !s.symbol.toUpperCase().includes(q)) return false;
      return true;
    });
  }, [signals, tierFilter, symbolQuery]);

  const filtersActive = tierFilter !== "all" || symbolQuery.trim() !== "";

  return (
    <div className="space-y-10">
      {showCreate ? (
        <SignalCreateForm collapsible defaultCollapsed />
      ) : null}

      <section id="signal-list" aria-labelledby="signal-list-heading">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <h2
            id="signal-list-heading"
            className="text-lg font-medium text-foreground"
          >
            {t("list")}
          </h2>
          {signals.length > 0 ? (
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-end sm:gap-3">
              <div className="grid flex-1 gap-3 sm:flex sm:max-w-md sm:flex-initial sm:items-end">
                <div className="min-w-0 flex-1">
                  <Label htmlFor="signal-filter-tier" className="text-xs">
                    {t("filterTier")}
                  </Label>
                  <select
                    id="signal-filter-tier"
                    value={tierFilter}
                    onChange={(e) =>
                      setTierFilter(e.target.value as "all" | "FREE" | "VIP")
                    }
                    className={toolbarSelectClass}
                  >
                    <option value="all">{t("filterTierAll")}</option>
                    <option value="FREE">{t("filterTierFree")}</option>
                    <option value="VIP">{t("filterTierVip")}</option>
                  </select>
                </div>
                <div className="min-w-0 flex-1">
                  <Label htmlFor="signal-filter-symbol" className="text-xs">
                    {t("filterSymbol")}
                  </Label>
                  <Input
                    id="signal-filter-symbol"
                    value={symbolQuery}
                    onChange={(e) => setSymbolQuery(e.target.value)}
                    placeholder={t("filterSymbolPlaceholder")}
                    className="mt-1 font-mono uppercase"
                    autoComplete="off"
                  />
                </div>
              </div>
              {filtersActive ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 shrink-0 self-start sm:self-auto"
                  onClick={() => {
                    setTierFilter("all");
                    setSymbolQuery("");
                  }}
                >
                  {t("filterReset")}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>

        {signals.length === 0 && (
          <div className="mt-4">
            <EmptyState
              title={t("empty")}
              description={
                showCreate ? t("emptyCreate") : t("emptyLogin")
              }
              primary={
                !showCreate
                  ? {
                      href: "/auth/signin?callbackUrl=/signals",
                      label: tc("signIn"),
                    }
                  : undefined
              }
              secondary={[
                { href: "/quotes", label: tn("quotes") },
                { href: "/calendar", label: tn("calendar") },
                { href: "/leaderboard", label: tn("leaderboard") },
              ]}
            />
          </div>
        )}

        {signals.length > 0 && filtered.length === 0 && (
          <p className="mt-6 rounded-lg border border-border/60 bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
            {t("listFilteredEmpty")}
          </p>
        )}

        <ul className="mt-4 space-y-4">
          {filtered.map((s) => (
            <li key={s.id}>
              <Card>
                <CardContent className="space-y-3 pt-4 pb-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-lg font-semibold tracking-tight text-foreground">
                        {s.symbol}
                      </span>
                      <Badge
                        variant={
                          s.direction === "LONG" ? "default" : "destructive"
                        }
                        className="text-xs"
                      >
                        {s.direction}
                      </Badge>
                      <Badge
                        variant={s.tier === "VIP" ? "secondary" : "outline"}
                        className="text-xs"
                      >
                        {s.tier}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground sm:text-right">
                      <span>{s.authorLabel}</span>
                      <span className="mx-1.5 text-border" aria-hidden>
                        ·
                      </span>
                      <time dateTime={s.createdAt}>
                        {new Date(s.createdAt).toLocaleString()}
                      </time>
                    </p>
                  </div>

                  <SignalImageGallery
                    className="mt-1"
                    size="sm"
                    imageUrls={s.imageUrls}
                    imageCount={s.imageCount}
                    masked={s.masked}
                  />

                  {s.masked ? (
                    <p className="text-sm text-amber-400/90">
                      {t("maskedMessage")}
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 rounded-lg border border-border/60 bg-muted/25 p-3 sm:gap-3">
                      <div className="min-w-0">
                        <div className="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
                          {t("entryField")}
                        </div>
                        <div className="truncate font-mono text-sm tabular-nums text-foreground">
                          {s.entry}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
                          {t("slField")}
                        </div>
                        <div className="truncate font-mono text-sm tabular-nums text-foreground">
                          {s.stopLoss ?? "—"}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
                          {t("tpField")}
                        </div>
                        <div className="truncate font-mono text-sm tabular-nums text-foreground">
                          {s.takeProfit ?? "—"}
                        </div>
                      </div>
                    </div>
                  )}

                  {s.notes && !s.masked ? (
                    <p className="text-sm text-muted-foreground">{s.notes}</p>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {t("status")}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs font-medium",
                        statusBadgeClass(s.status),
                      )}
                    >
                      {statusLabel(s.status, t)}
                    </Badge>
                    {s.isAuthor && s.status === "ACTIVE" ? (
                      <CloseSignalForm signalId={s.id} />
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-3 border-t border-border/40 pt-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <ThumbsUp className="size-3.5 shrink-0" aria-hidden />
                        {s.likes}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <ThumbsDown className="size-3.5 shrink-0" aria-hidden />
                        {s.dislikes}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MessageCircle
                          className="size-3.5 shrink-0"
                          aria-hidden
                        />
                        {s.commentCount}
                      </span>
                    </div>
                    <Link
                      href={`/signals/${s.id}`}
                      className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
                      aria-label={t("viewDetailAria", { symbol: s.symbol })}
                    >
                      {t("viewDetail")} →
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function CloseSignalForm({ signalId }: { signalId: string }) {
  const t = useTranslations("signals");
  const [state, formAction] = useActionState(closeSignal, closeInitial);
  return (
    <form action={formAction} className="inline-flex flex-wrap gap-1.5">
      <input type="hidden" name="signalId" value={signalId} />
      {state?.error ? (
        <span className="w-full text-destructive">{state.error}</span>
      ) : null}
      <Button
        type="submit"
        name="status"
        value="CLOSED_WIN"
        size="sm"
        variant="outline"
        className="h-8 gap-1 px-2 text-xs text-emerald-400 hover:text-emerald-300"
      >
        {t("closeTpHit")}
      </Button>
      <Button
        type="submit"
        name="status"
        value="CLOSED_LOSS"
        size="sm"
        variant="outline"
        className="h-8 gap-1 px-2 text-xs text-destructive hover:text-red-400"
      >
        {t("closeSlHit")}
      </Button>
      <Button
        type="submit"
        name="status"
        value="CANCELLED"
        size="sm"
        variant="ghost"
        className="h-8 gap-1 px-2 text-xs"
      >
        {t("closeCancelSignal")}
      </Button>
    </form>
  );
}
