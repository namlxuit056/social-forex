"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  BookOpen,
  Loader2,
  MessageSquare,
  Radio,
  TrendingUp,
  TrendingDown,
  UserPlus,
  Check,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SuggestedTrader } from "@/app/api/traders/suggested/route";

type FeedAuthor = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
};

type FeedItem = {
  id: string;
  type: "signal_new" | "signal_win" | "signal_loss" | "journal" | "forum";
  createdAt: string;
  author: FeedAuthor;
  data: Record<string, unknown>;
};

type FeedFilter = "all" | "signals" | "journal" | "forum";

const typeConfig: Record<
  FeedItem["type"],
  { icon: typeof Radio; color: string; labelKey: string }
> = {
  signal_new: { icon: Radio, color: "text-blue-500", labelKey: "signalNew" },
  signal_win: { icon: TrendingUp, color: "text-green-500", labelKey: "signalWin" },
  signal_loss: { icon: TrendingDown, color: "text-red-500", labelKey: "signalLoss" },
  journal: { icon: BookOpen, color: "text-violet-500", labelKey: "journalEntry" },
  forum: { icon: MessageSquare, color: "text-orange-500", labelKey: "forumThread" },
};

function timeAgo(dateStr: string, t: (key: string) => string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return t("justNow");
  if (mins < 60) return `${mins}${t("minutesAgo")}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}${t("hoursAgo")}`;
  const days = Math.floor(hours / 24);
  return `${days}${t("daysAgo")}`;
}

export function FeedSection() {
  const t = useTranslations("dashboard");
  const [items, setItems] = useState<FeedItem[]>([]);
  const [filter, setFilter] = useState<FeedFilter>("all");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [suggested, setSuggested] = useState<SuggestedTrader[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  const fetchFeed = useCallback(
    async (reset = false) => {
      const isLoadMore = !reset && items.length > 0;
      if (isLoadMore) setLoadingMore(true);
      else setLoading(true);

      try {
        const params = new URLSearchParams({ filter, limit: "20" });
        if (!reset && items.length > 0) {
          params.set("before", items[items.length - 1].createdAt);
        }
        const res = await fetch(`/api/feed?${params}`);
        if (!res.ok) return;
        const data = (await res.json()) as { items: FeedItem[]; hasMore: boolean };
        if (reset) {
          setItems(data.items);
        } else {
          setItems((prev) => [...prev, ...data.items]);
        }
        setHasMore(data.hasMore);
      } catch {
        // Silent fail
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [filter, items],
  );

  useEffect(() => {
    void fetchFeed(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    const interval = setInterval(() => void fetchFeed(true), 30_000);
    return () => clearInterval(interval);
  }, [fetchFeed]);

  useEffect(() => {
    fetch("/api/traders/suggested")
      .then((r) => r.json())
      .then((data: { traders: SuggestedTrader[] }) => setSuggested(data.traders ?? []))
      .catch(() => {});
  }, []);

  async function handleFollow(traderId: string) {
    const formData = new FormData();
    formData.set("targetUserId", traderId);
    const { toggleFollowUser } = await import("@/actions/social");
    await toggleFollowUser(formData);
    setFollowingIds((prev) => {
      const next = new Set(prev);
      if (next.has(traderId)) next.delete(traderId);
      else next.add(traderId);
      return next;
    });
    void fetchFeed(true);
  }

  const filters: { key: FeedFilter; label: string }[] = [
    { key: "all", label: t("feedFilterAll") },
    { key: "signals", label: t("feedFilterSignals") },
    { key: "journal", label: t("feedFilterJournal") },
    { key: "forum", label: t("feedFilterForum") },
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-heading text-lg font-medium text-foreground">
            {t("feedTitle")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("feedHint")}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition",
                filter === f.key
                  ? "bg-primary/15 text-primary"
                  : "bg-muted/30 text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="space-y-5">
          <div className="rounded-lg border border-dashed border-border bg-muted/15 px-4 py-6 text-center">
            <p className="text-sm text-muted-foreground">{t("feedEmpty")}</p>
            <Link
              href="/leaderboard"
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              {t("feedDiscoverTraders")}
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
          {suggested.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">
                {t("feedSuggestedTitle")}
              </p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {suggested.map((trader) => {
                  const displayName = trader.name ?? "—";
                  const isFollowing = followingIds.has(trader.id);
                  return (
                    <li
                      key={trader.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/u/${trader.id}`}
                          className="block truncate text-sm font-medium text-foreground hover:text-primary"
                        >
                          {displayName}
                        </Link>
                        <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span>{t("feedLv")}{trader.level}</span>
                          {trader.signalCount > 0 && (
                            <span>{t("feedSignals", { count: trader.signalCount })}</span>
                          )}
                          {trader.winRate !== null && (
                            <span className="text-green-500">
                              {t("feedWinRate", { rate: trader.winRate })}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => void handleFollow(trader.id)}
                        className={cn(
                          "flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                          isFollowing
                            ? "bg-primary/15 text-primary"
                            : "bg-muted/50 text-muted-foreground hover:bg-primary/10 hover:text-primary",
                        )}
                      >
                        {isFollowing ? (
                          <Check className="size-3" />
                        ) : (
                          <UserPlus className="size-3" />
                        )}
                        {isFollowing ? t("feedFollowingBtn") : t("feedFollowBtn")}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {items.map((item) => {
            const config = typeConfig[item.type];
            const Icon = config.icon;
            const authorName = item.author.name ?? "—";

            return (
              <div
                key={item.id}
                className="flex items-start gap-3 px-4 py-3 transition hover:bg-muted/20"
              >
                <div className={cn("mt-0.5 shrink-0", config.color)}>
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Link
                      href={`/u/${item.author.id}`}
                      className="text-sm font-medium text-foreground hover:text-primary"
                    >
                      {authorName}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {t(config.labelKey)}
                    </span>
                  </div>
                  <FeedItemContent item={item} />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {timeAgo(item.createdAt, t)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {hasMore && !loading && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchFeed(false)}
            disabled={loadingMore}
          >
            {loadingMore ? (
              <Loader2 className="mr-1 size-3.5 animate-spin" />
            ) : null}
            {t("feedLoadMore")}
          </Button>
        </div>
      )}
    </section>
  );
}

function FeedItemContent({ item }: { item: FeedItem }) {
  const t = useTranslations("dashboard");

  if (item.type === "signal_new" || item.type === "signal_win" || item.type === "signal_loss") {
    const d = item.data;
    return (
      <Link
        href={`/signals/${d.signalId}`}
        className="mt-1 block rounded-md border border-border bg-muted/20 px-3 py-2 hover:bg-muted/30"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-semibold text-foreground">
            {String(d.symbol)} {String(d.direction)}
          </span>
          {d.tier === "VIP" && (
            <Badge variant="secondary" className="text-[10px]">VIP</Badge>
          )}
          <Badge variant="outline" className="text-[10px]">{String(d.status)}</Badge>
        </div>
        <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
          <span>Entry: <span className="font-mono text-foreground">{String(d.entry)}</span></span>
          {d.stopLoss != null && (
            <span>SL: <span className="font-mono text-foreground">{String(d.stopLoss)}</span></span>
          )}
          {d.takeProfit != null && (
            <span>TP: <span className="font-mono text-foreground">{String(d.takeProfit)}</span></span>
          )}
        </div>
      </Link>
    );
  }

  if (item.type === "journal") {
    const d = item.data;
    const pnl = d.pnl as number | null;
    return (
      <p className="mt-1 text-sm text-muted-foreground">
        {t("feedJournalBody")}{" "}
        <span className="font-mono font-medium text-foreground">
          {String(d.symbol)} {String(d.direction)}
        </span>
        {pnl != null && (
          <span className={cn("ml-1 font-mono font-medium", pnl >= 0 ? "text-green-500" : "text-red-500")}>
            {pnl >= 0 ? "+" : ""}{pnl.toFixed(2)}
          </span>
        )}
      </p>
    );
  }

  if (item.type === "forum") {
    return (
      <Link
        href={`/forum/${item.data.threadId}`}
        className="mt-1 block text-sm font-medium text-foreground hover:text-primary"
      >
        {String(item.data.title)}
      </Link>
    );
  }

  return null;
}
