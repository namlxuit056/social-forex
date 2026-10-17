"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { ChevronRight, MessageCircle, ShieldCheck, ThumbsDown, ThumbsUp } from "lucide-react";
import { StreakBadge } from "@/components/signals/streak-badge";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { SignalCloseForm } from "@/components/signals/signal-close-form";
import { SignalCardNews } from "@/components/signals/signal-card-news";
import { SignalShareCopy } from "@/components/signals/signal-share-copy";
import { SignalCreateForm } from "@/components/signals/signal-create-form";
import { SignalImageGallery } from "@/components/signals/signal-image-gallery";
import { EmptyState } from "@/components/layout/empty-state";
import { Badge } from "@/components/ui/badge";
import { FieldSelect } from "@/components/ui/field-select";
import {
  DirectionBadge,
  SignalStatusBadge,
  TierBadge,
} from "@/components/ui/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  buildSignalsListHref,
  type SignalDatePeriod,
  type SignalListSort,
  type SignalStatusFilter,
  type SignalListTz,
} from "@/lib/signals/signal-list-query";
import type { SignalCardNewsEvent } from "@/lib/signals/signal-list-news";
import { signalLevel } from "@/components/signals/signal-level-classes";
import { FollowButton } from "@/components/social/follow-button";
import { VipSignalTeaser } from "@/components/signals/vip-signal-teaser";
import { cn } from "@/lib/utils";

type SignalRow = {
  id: string;
  symbol: string;
  direction: string;
  entry: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  takeProfit2: number | null;
  takeProfit3: number | null;
  tier: "FREE" | "VIP";
  status: "PENDING" | "ACTIVE" | "CLOSED_WIN" | "CLOSED_LOSS" | "CANCELLED";
  notes: string | null;
  masked: boolean;
  authorLabel: string;
  /** `User.image` (OAuth / profile); null → initials fallback */
  authorImage: string | null;
  authorId: string;
  isAuthor: boolean;
  /** Viewer đã follow tác giả (chỉ khi đăng nhập và không phải tác giả). */
  viewerFollowsAuthor: boolean;
  shareUrl: string;
  likes: number;
  dislikes: number;
  commentCount: number;
  imageUrls: string[];
  imageCount: number;
  createdAt: string;
  /** Tác giả có MT5 active (revokedAt = null). */
  authorHasMt5?: boolean;
  authorStreakSignal?: number;
};

function statusLabel(
  status: SignalRow["status"],
  t: (key: string) => string,
): string {
  switch (status) {
    case "PENDING":
      return t("statusPending");
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

/** Reward-to-risk to TP1, shown next to the direction so signals compare at a glance. */
function RewardRiskLabel({
  entry,
  stopLoss,
  takeProfit,
}: {
  entry: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
}) {
  const t = useTranslations("signals");
  if (entry == null || stopLoss == null || takeProfit == null) return null;
  const risk = Math.abs(entry - stopLoss);
  if (risk === 0) return null;
  const value = (Math.abs(takeProfit - entry) / risk).toFixed(1);
  return (
    <span
      className="font-mono text-sm font-medium tabular-nums text-foreground"
      title={t("rrBadgeAria")}
    >
      {t("rrBadge", { value })}
    </span>
  );
}

function authorInitials(label: string): string {
  const raw = label.trim();
  if (!raw || raw === "—") return "?";
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0]?.[0] ?? "";
    const b = parts[1]?.[0] ?? "";
    return (a + b).toUpperCase().slice(0, 2);
  }
  return raw.slice(0, 2).toUpperCase();
}

const DEFAULT_QUICK_SYMBOLS = ["XAUUSD", "EURUSD", "GBPUSD"];

export function SignalRoom({
  signals,
  showCreate,
  initialSymbolFilter = "",
  initialAuthorFilter = "",
  initialStatusFilter = "all",
  initialPeriodFilter = "today",
  initialTzFilter = "vn",
  initialTierFilter = "all",
  sort,
  page,
  pageSize,
  totalPages,
  totalMatching,
  totalUnfiltered,
  hasMore,
  newsBySignalId = {},
  newsContextHours = 24,
  favoriteSymbols = [],
  currentUserId = null,
  vipWinRateLabel = null,
}: {
  signals: SignalRow[];
  showCreate: boolean;
  currentUserId?: string | null;
  favoriteSymbols?: string[];
  vipWinRateLabel?: string | null;
  initialSymbolFilter?: string;
  initialAuthorFilter?: string;
  initialStatusFilter?: SignalStatusFilter;
  initialPeriodFilter?: SignalDatePeriod;
  initialTzFilter?: SignalListTz;
  initialTierFilter?: "all" | "FREE" | "VIP";
  sort: SignalListSort;
  page: number;
  pageSize: number;
  totalPages: number;
  totalMatching: number;
  totalUnfiltered: number;
  hasMore: boolean;
  newsBySignalId?: Record<string, SignalCardNewsEvent[]>;
  newsContextHours?: number;
}) {
  const t = useTranslations("signals");
  const tn = useTranslations("nav");
  const tc = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tierFilter = initialTierFilter;
  const statusFilter = initialStatusFilter;
  const periodFilter = initialPeriodFilter;
  const tzFilter = initialTzFilter;

  const [symbolQuery, setSymbolQuery] = useState(() =>
    initialSymbolFilter.trim(),
  );
  const [authorQuery, setAuthorQuery] = useState(() =>
    initialAuthorFilter.trim(),
  );

  useEffect(() => {
    setSymbolQuery(initialSymbolFilter.trim());
  }, [initialSymbolFilter]);

  useEffect(() => {
    setAuthorQuery(initialAuthorFilter.trim());
  }, [initialAuthorFilter]);

  const filtersActive =
    tierFilter !== "all" ||
    symbolQuery.trim() !== "" ||
    authorQuery.trim() !== "" ||
    statusFilter !== "all" ||
    periodFilter !== "today" ||
    tzFilter !== "vn";

  const applyFilters = (
    patch: Partial<Parameters<typeof buildSignalsListHref>[0]>,
  ) => {
    router.replace(
      buildSignalsListHref({
        pathname,
        symbol: symbolQuery,
        author: authorQuery,
        tier: tierFilter,
        status: statusFilter,
        period: periodFilter,
        tz: tzFilter,
        sort,
        page: 1,
        ...patch,
      }),
      { scroll: false },
    );
  };

  useEffect(() => {
    const id = window.setTimeout(() => {
      const q = symbolQuery.trim();
      if (q === initialSymbolFilter.trim()) return;

      const nextHref = buildSignalsListHref({
        pathname,
        symbol: symbolQuery,
        author: authorQuery,
        tier: tierFilter,
        status: statusFilter,
        period: periodFilter,
        tz: tzFilter,
        sort,
        page: 1,
      });
      const cur = searchParams.toString();
      const nextQ = nextHref.includes("?")
        ? nextHref.slice(nextHref.indexOf("?") + 1)
        : "";
      if (nextQ === cur) return;
      router.replace(nextHref, { scroll: false });
    }, 400);
    return () => window.clearTimeout(id);
  }, [
    symbolQuery,
    initialSymbolFilter,
    authorQuery,
    pathname,
    router,
    searchParams,
    tierFilter,
    statusFilter,
    periodFilter,
    tzFilter,
    sort,
  ]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      const a = authorQuery.trim();
      if (a === initialAuthorFilter.trim()) return;

      const nextHref = buildSignalsListHref({
        pathname,
        symbol: symbolQuery,
        author: authorQuery,
        tier: tierFilter,
        status: statusFilter,
        period: periodFilter,
        tz: tzFilter,
        sort,
        page: 1,
      });
      const cur = searchParams.toString();
      const nextQ = nextHref.includes("?")
        ? nextHref.slice(nextHref.indexOf("?") + 1)
        : "";
      if (nextQ === cur) return;
      router.replace(nextHref, { scroll: false });
    }, 400);
    return () => window.clearTimeout(id);
  }, [
    authorQuery,
    initialAuthorFilter,
    symbolQuery,
    pathname,
    router,
    searchParams,
    tierFilter,
    statusFilter,
    periodFilter,
    tzFilter,
    sort,
  ]);

  const rangeFrom =
    signals.length > 0 ? (page - 1) * pageSize + 1 : 0;
  const rangeTo = (page - 1) * pageSize + signals.length;

  const prevHref = buildSignalsListHref({
    pathname,
    symbol: initialSymbolFilter,
    author: initialAuthorFilter,
    tier: tierFilter,
    status: statusFilter,
    period: periodFilter,
    tz: tzFilter,
    sort,
    page: page - 1,
  });
  const nextHref = buildSignalsListHref({
    pathname,
    symbol: initialSymbolFilter,
    author: initialAuthorFilter,
    tier: tierFilter,
    status: statusFilter,
    period: periodFilter,
    tz: tzFilter,
    sort,
    page: page + 1,
  });

  return (
    <div className="space-y-8">
      {showCreate ? (
        <SignalCreateForm collapsible defaultCollapsed />
      ) : null}

      <section id="signal-list" aria-labelledby="signal-list-heading" className="space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <h2
            id="signal-list-heading"
            className="text-lg font-semibold tracking-tight text-foreground"
          >
            {t("list")}
          </h2>
          {totalUnfiltered > 0 ? (
            <p className="text-xs text-muted-foreground">
              {t("listToolbarHint")}
            </p>
          ) : null}
        </div>

        {totalUnfiltered > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              {favoriteSymbols.length > 0
                ? t("watchlistQuickLabel")
                : t("quickSymbolLabel")}
            </span>
            {[
              ...favoriteSymbols,
              ...DEFAULT_QUICK_SYMBOLS.filter(
                (sym) =>
                  !favoriteSymbols.some(
                    (fav) => fav.toUpperCase() === sym.toUpperCase(),
                  ),
              ),
            ].map((sym) => {
              const active =
                initialSymbolFilter.trim().toUpperCase() === sym.toUpperCase();
              return (
                <Link
                  key={sym}
                  href={buildSignalsListHref({
                    pathname,
                    symbol: active ? "" : sym,
                    author: initialAuthorFilter,
                    tier: tierFilter,
                    status: statusFilter,
                    period: periodFilter,
                    tz: tzFilter,
                    sort,
                    page: 1,
                  })}
                  scroll={false}
                  className={cn(
                    "rounded-full border px-2.5 py-1 font-mono text-xs font-medium transition-colors",
                    active
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border/70 bg-muted/40 text-muted-foreground hover:border-primary/50 hover:text-foreground",
                  )}
                >
                  {sym}
                </Link>
              );
            })}
            {initialSymbolFilter.trim() !== "" ? (
              <Link
                href={buildSignalsListHref({
                  pathname,
                  symbol: "",
                  author: initialAuthorFilter,
                  tier: tierFilter,
                  status: statusFilter,
                  period: periodFilter,
                  tz: tzFilter,
                  sort,
                  page: 1,
                })}
                scroll={false}
                className="rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
              >
                {t("quickSymbolAll")}
              </Link>
            ) : null}
          </div>
        ) : null}

        {totalUnfiltered > 0 ? (
          <div className="space-y-2 rounded-xl border border-border bg-card p-3 sm:p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-0 flex-1 basis-44">
                <Label htmlFor="signal-filter-symbol" className="text-xs">
                  {t("filterSymbol")}
                </Label>
                <Input
                  id="signal-filter-symbol"
                  value={symbolQuery}
                  onChange={(e) => setSymbolQuery(e.target.value)}
                  placeholder={t("filterSymbolPlaceholder")}
                  className="mt-1 h-9 font-mono uppercase"
                  autoComplete="off"
                />
              </div>
              <div className="min-w-0 flex-1 basis-44">
                <Label htmlFor="signal-filter-author" className="text-xs">
                  {t("filterAuthor")}
                </Label>
                <Input
                  id="signal-filter-author"
                  value={authorQuery}
                  onChange={(e) => setAuthorQuery(e.target.value)}
                  placeholder={t("filterAuthorPlaceholder")}
                  className="mt-1 h-9"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              <FieldSelect
                id="signal-filter-period"
                label={t("filterPeriod")}
                className="w-[calc(50%-0.375rem)] sm:w-36"
                value={periodFilter}
                onValueChange={(period) => applyFilters({ period })}
                options={[
                  { value: "today", label: t("filterPeriodToday") },
                  { value: "week", label: t("filterPeriodWeek") },
                  { value: "all", label: t("filterPeriodAll") },
                ]}
              />
              <FieldSelect
                id="signal-filter-status"
                label={t("filterStatus")}
                className="w-[calc(50%-0.375rem)] sm:w-36"
                value={statusFilter}
                onValueChange={(status) => applyFilters({ status })}
                options={[
                  { value: "all", label: t("filterStatusAll") },
                  { value: "PENDING", label: t("filterStatusPending") },
                  { value: "ACTIVE", label: t("filterStatusActive") },
                  { value: "CLOSED_WIN", label: t("filterStatusClosedWin") },
                  { value: "CLOSED_LOSS", label: t("filterStatusClosedLoss") },
                  { value: "CANCELLED", label: t("filterStatusCancelled") },
                ]}
              />
              <FieldSelect
                id="signal-filter-tier"
                label={t("filterTier")}
                className="w-[calc(50%-0.375rem)] sm:w-36"
                value={tierFilter}
                onValueChange={(tier) => applyFilters({ tier })}
                options={[
                  { value: "all", label: t("filterTierAll") },
                  { value: "FREE", label: t("filterTierFree") },
                  { value: "VIP", label: t("filterTierVip") },
                ]}
              />
              <FieldSelect
                id="signal-sort"
                label={t("sortLabel")}
                className="w-[calc(50%-0.375rem)] sm:w-36"
                value={sort}
                onValueChange={(nextSort) => applyFilters({ sort: nextSort })}
                options={[
                  { value: "newest", label: t("sortNewest") },
                  { value: "symbol", label: t("sortSymbol") },
                  { value: "tier", label: t("sortTier") },
                ]}
              />
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium">
                  {t("filterTimezone")}
                </span>
                <div
                  className="inline-flex h-9 w-fit items-center rounded-lg border border-border bg-muted/40 p-0.5"
                  role="group"
                  aria-label={t("filterTimezone")}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (tzFilter === "vn") return;
                      applyFilters({ tz: "vn" });
                    }}
                    className={cn(
                      "h-full rounded-md px-3 text-xs font-medium transition-colors",
                      tzFilter === "vn"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t("filterTzVn")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (tzFilter === "utc") return;
                      applyFilters({ tz: "utc" });
                    }}
                    className={cn(
                      "h-full rounded-md px-3 text-xs font-medium transition-colors",
                      tzFilter === "utc"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t("filterTzUtc")}
                  </button>
                </div>
              </div>
              <div className="flex items-end">
                {filtersActive ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9"
                    onClick={() => {
                      setSymbolQuery("");
                      setAuthorQuery("");
                      router.replace(pathname, { scroll: false });
                    }}
                  >
                    {t("filterReset")}
                  </Button>
                ) : null}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("filterPeriodHint", {
                zone:
                  tzFilter === "utc"
                    ? t("filterTzUtcLong")
                    : t("filterTzVnLong"),
              })}
            </p>
          </div>
        ) : null}

        {totalUnfiltered === 0 && (
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

        {totalUnfiltered > 0 && totalMatching === 0 && (
          <p className="mt-6 rounded-lg border border-border/60 bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
            {t("listFilteredEmpty")}
          </p>
        )}

        {totalMatching > 0 && (
          <ul className="mt-4 space-y-4">
            {signals.map((s) => (
              <li key={s.id}>
                <Card className="overflow-hidden border-border/60">
                  <CardContent className="p-0">
                    <div className="flex flex-col lg:flex-row lg:items-stretch">
                      <div className="min-w-0 flex-1 space-y-3 p-4 sm:p-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-lg font-semibold tracking-tight text-foreground">
                              {s.symbol}
                            </span>
                            <DirectionBadge direction={s.direction} />
                            <TierBadge tier={s.tier} />
                            <RewardRiskLabel
                              entry={s.entry}
                              stopLoss={s.stopLoss}
                              takeProfit={s.takeProfit}
                            />
                          </div>
                          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:max-w-[min(100%,22rem)] sm:justify-end sm:text-right">
                            <Link
                              href={`/u/${s.authorId}`}
                              aria-label={t("authorProfileAria", {
                                name: s.authorLabel,
                              })}
                              className="inline-flex min-w-0 max-w-full items-center gap-2 rounded-md text-muted-foreground transition-colors hover:text-foreground"
                            >
                              <span className="inline-flex size-8 shrink-0 overflow-hidden rounded-full bg-muted ring-1 ring-border">
                                {s.authorImage ? (
                                  // OAuth URLs vary; avoid next/image remotePatterns churn
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={s.authorImage}
                                    alt=""
                                    className="size-full object-cover"
                                    loading="lazy"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <span
                                    className="flex size-full items-center justify-center text-[0.65rem] font-semibold uppercase text-muted-foreground"
                                    aria-hidden
                                  >
                                    {authorInitials(s.authorLabel)}
                                  </span>
                                )}
                              </span>
                              <span className="min-w-0 truncate font-medium text-primary underline-offset-4 hover:underline">
                                {s.authorLabel}
                              </span>
                            </Link>
                            {s.authorHasMt5 && (
                              <Badge
                                variant="outline"
                                className="gap-1 border-emerald-500/30 bg-emerald-500/8 text-emerald-600 dark:text-emerald-400 text-[10px] px-1.5 py-0.5 h-5"
                              >
                                <ShieldCheck className="size-2.5" />
                                MT5
                              </Badge>
                            )}
                            {(s.authorStreakSignal ?? 0) >= 3 && (
                              <StreakBadge count={s.authorStreakSignal!} type="signal" />
                            )}
                            {currentUserId && !s.isAuthor ? (
                              <FollowButton
                                userId={s.authorId}
                                isFollowing={s.viewerFollowsAuthor}
                              />
                            ) : null}
                            <span className="text-border" aria-hidden>
                              ·
                            </span>
                            <time
                              dateTime={s.createdAt}
                              className="shrink-0 text-muted-foreground"
                            >
                              {new Date(s.createdAt).toLocaleString()}
                            </time>
                          </div>
                        </div>

                        <SignalImageGallery
                          className="mt-1"
                          size="sm"
                          imageUrls={s.imageUrls}
                          imageCount={s.imageCount}
                          masked={s.masked}
                        />

                        {s.masked ? (
                          <VipSignalTeaser
                            signalId={s.id}
                            surface="signals_list"
                            variant="compact"
                            message={t("maskedMessage")}
                            ctaLabel={t("upgradeVipCta")}
                            winRateLabel={vipWinRateLabel}
                          />
                        ) : (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2 sm:gap-3">
                              <div className={cn("min-w-0", signalLevel.entry.box)}>
                                <div className={signalLevel.entry.label}>
                                  {t("entryField")}
                                </div>
                                <div className={signalLevel.entry.value}>
                                  {s.entry}
                                </div>
                              </div>
                              <div className={cn("min-w-0", signalLevel.sl.box)}>
                                <div className={signalLevel.sl.label}>
                                  {t("slField")}
                                </div>
                                <div className={signalLevel.sl.value}>
                                  {s.stopLoss ?? "—"}
                                </div>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 sm:gap-3">
                              <div className={cn("min-w-0", signalLevel.tp1.box)}>
                                <div className={signalLevel.tp1.label}>
                                  {t("tp1Field")}
                                </div>
                                <div className={signalLevel.tp1.value}>
                                  {s.takeProfit ?? "—"}
                                </div>
                              </div>
                              <div className={cn("min-w-0", signalLevel.tp2.box)}>
                                <div className={signalLevel.tp2.label}>
                                  {t("tp2Field")}
                                </div>
                                <div className={signalLevel.tp2.value}>
                                  {s.takeProfit2 ?? "—"}
                                </div>
                              </div>
                              <div className={cn("min-w-0", signalLevel.tp3.box)}>
                                <div className={signalLevel.tp3.label}>
                                  {t("tp3Field")}
                                </div>
                                <div className={signalLevel.tp3.value}>
                                  {s.takeProfit3 ?? "—"}
                                </div>
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
                          <SignalStatusBadge
                            status={s.status}
                            label={statusLabel(s.status, t)}
                          />
                          {s.isAuthor && s.status === "ACTIVE" ? (
                            <SignalCloseForm signalId={s.id} />
                          ) : null}
                        </div>
                      </div>

                      <SignalCardNews
                        symbol={s.symbol}
                        events={newsBySignalId[s.id] ?? []}
                        windowHours={newsContextHours}
                      />
                    </div>

                    <div className="flex flex-col gap-3 border-t border-border/40 bg-muted/5 px-4 py-3 sm:px-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                          {s.isAuthor ? (
                            <SignalShareCopy
                              show
                              symbol={s.symbol}
                              direction={s.direction}
                              tier={s.tier}
                              status={s.status}
                              entry={s.entry}
                              stopLoss={s.stopLoss}
                              takeProfit={s.takeProfit}
                              takeProfit2={s.takeProfit2}
                              takeProfit3={s.takeProfit3}
                              notes={s.notes}
                              signalUrl={s.shareUrl}
                              className="h-9"
                            />
                          ) : null}
                          <Link
                            href={`/signals/${s.id}`}
                            className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
                            aria-label={t("viewDetailAria", { symbol: s.symbol })}
                          >
                            {t("viewDetail")}
                            <ChevronRight className="size-4 shrink-0" aria-hidden />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}

        {totalMatching > 0 && (page > 1 || hasMore) ? (
          <div className="mt-6 flex flex-col gap-3 border-t border-border/40 pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {t("paginationRange", {
                  from: rangeFrom,
                  to: rangeTo,
                  total: totalMatching,
                })}
              </p>
              {totalPages > 1 ? (
                <p className="text-xs text-muted-foreground/90">
                  {t("paginationPageOf", { page, totalPages })}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {page > 1 ? (
                <Link
                  href={prevHref}
                  scroll={false}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  {t("paginationPrevious")}
                </Link>
              ) : null}
              {hasMore ? (
                <Link
                  href={nextHref}
                  scroll={false}
                  className={buttonVariants({ variant: "default", size: "sm" })}
                >
                  {t("loadMore")}
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
