import { Lock } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignalRoom } from "@/components/signals/signal-room";
import { Disclaimer } from "@/components/layout/disclaimer";
import { PageCtaRow } from "@/components/layout/page-cta-row";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { isVipActive } from "@/lib/vip";
import { pageCtaItems } from "@/lib/page-cta-i18n";
import { absoluteUrl } from "@/lib/site-url";
import {
  getNewsContextHours,
  getNewsContextWindow,
  getUpcomingHighAndMediumImpactEvents,
} from "@/lib/calendar/news-context-db";
import {
  buildSignalOrderBy,
  buildSignalWhere,
  buildSignalsListHref,
  parseSignalListSearchParams,
  SIGNAL_LIST_PAGE_SIZE,
} from "@/lib/signals/signal-list-query";
import { mapCalendarEventsToSignals } from "@/lib/signals/signal-list-news";
import { symbolToCurrencies } from "@/lib/signals/symbol-currencies";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("signals");
  return { title: t("title"), description: t("description") };
}

export const dynamic = "force-dynamic";

export default async function SignalsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    symbol?: string;
    author?: string;
    tier?: string;
    status?: string;
    period?: string;
    tz?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const { locale } = await params;
  const rawSp = await searchParams;
  const { symbol, author, tier, status, period, tz, sort, page } =
    parseSignalListSearchParams(rawSp);
  setRequestLocale(locale);
  const t = await getTranslations("signals");
  const tc = await getTranslations("common");

  const session = await auth();
  const userId = session?.user?.id;

  const [dbUser, favoriteRows] = userId
    ? await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: { vipUntil: true },
        }),
        prisma.userFavoriteSymbol.findMany({
          where: { userId },
          orderBy: { sortOrder: "asc" },
          select: { symbol: true },
        }),
      ])
    : [null, []];

  const favoriteSymbols = favoriteRows.map((r) => r.symbol);

  const canViewVip = isVipActive(dbUser?.vipUntil);

  const where = buildSignalWhere(symbol, tier, author, status, period, tz);
  const orderBy = buildSignalOrderBy(sort);

  const [totalUnfiltered, totalMatching, vipCount, rawRows] = await Promise.all([
    prisma.signal.count(),
    prisma.signal.count({ where }),
    prisma.signal.count({ where: { tier: "VIP" } }),
    prisma.signal.findMany({
      where,
      orderBy,
      skip: (page - 1) * SIGNAL_LIST_PAGE_SIZE,
      take: SIGNAL_LIST_PAGE_SIZE + 1,
      include: {
        author: { select: { name: true, email: true, image: true } },
        reactions: { select: { type: true } },
        _count: { select: { comments: true } },
        images: { orderBy: { sortOrder: "asc" }, select: { url: true } },
      },
    }),
  ]);

  const hasMore = rawRows.length > SIGNAL_LIST_PAGE_SIZE;
  const rows = rawRows.slice(0, SIGNAL_LIST_PAGE_SIZE);

  const totalPages = Math.max(1, Math.ceil(totalMatching / SIGNAL_LIST_PAGE_SIZE));
  if (page > totalPages && totalMatching > 0) {
    redirect(
      buildSignalsListHref({
        pathname: "/signals",
        symbol,
        author,
        tier,
        status,
        period,
        tz,
        sort,
        page: totalPages,
      }),
    );
  }

  const hasVipSignals = vipCount > 0;

  const authorIds = [...new Set(rows.map((r) => r.authorId))];
  let followingIdSet = new Set<string>();
  if (userId && authorIds.length > 0) {
    const follows = await prisma.userFollow.findMany({
      where: {
        followerId: userId,
        followingId: { in: authorIds },
      },
      select: { followingId: true },
    });
    followingIdSet = new Set(follows.map((f) => f.followingId));
  }

  const signals = rows.map((s) => {
    const isAuthor = userId === s.authorId;
    const masked = s.tier === "VIP" && !canViewVip && !isAuthor;
    const imageUrls = masked ? [] : s.images.map((i) => i.url);
    return {
      id: s.id,
      symbol: s.symbol,
      direction: s.direction,
      entry: masked ? null : s.entry,
      stopLoss: masked ? null : s.stopLoss,
      takeProfit: masked ? null : s.takeProfit,
      takeProfit2: masked ? null : s.takeProfit2,
      takeProfit3: masked ? null : s.takeProfit3,
      tier: s.tier,
      status: s.status,
      notes: masked ? null : s.notes,
      masked,
      authorLabel: s.author?.name ?? s.author?.email ?? "—",
      authorImage: s.author?.image ?? null,
      authorId: s.authorId,
      isAuthor,
      viewerFollowsAuthor: userId ? followingIdSet.has(s.authorId) : false,
      shareUrl: absoluteUrl(`/signals/${s.id}`, locale),
      likes: s.reactions.filter((r) => r.type === "LIKE").length,
      dislikes: s.reactions.filter((r) => r.type === "DISLIKE").length,
      commentCount: s._count.comments,
      imageUrls,
      imageCount: s.images.length,
      createdAt: s.createdAt.toISOString(),
    };
  });

  const newsContextHours = getNewsContextHours();
  const { from: newsFrom, to: newsTo } = getNewsContextWindow();
  const calendarCurrencies = new Set<string>();
  for (const s of rows) {
    for (const c of symbolToCurrencies(s.symbol)) calendarCurrencies.add(c);
  }
  const calendarCurrencyList = [...calendarCurrencies];
  const calendarEvents =
    calendarCurrencyList.length > 0
      ? await getUpcomingHighAndMediumImpactEvents({
          currencies: calendarCurrencyList,
          from: newsFrom,
          to: newsTo,
          limit: Math.min(240, Math.max(48, rows.length * 12)),
        })
      : [];
  const newsBySignalId = mapCalendarEventsToSignals(
    rows.map((s) => ({ id: s.id, symbol: s.symbol })),
    calendarEvents,
  );

  const tCommon = await getTranslations("common");
  const ctaRow = await pageCtaItems("trading", "community");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          {t("title")}
        </h1>
        <p className="mt-2 text-muted-foreground">{t("description")}</p>
      </div>

      {!session?.user && (
        <Card className="border-primary/20 bg-card/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("loginToPost")}</CardTitle>
            <CardDescription>{t("loginHint")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/auth/signin?callbackUrl=/signals"
              className={cn(buttonVariants({ size: "sm" }))}
            >
              {tc("signIn")}
            </Link>
          </CardContent>
        </Card>
      )}

      {session?.user && !canViewVip && hasVipSignals && (
        <Card className="border-amber-500/30 bg-amber-950/20">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Lock className="size-4 text-amber-400" />
              <CardTitle className="text-base text-amber-200">
                {t("vipLocked")}
              </CardTitle>
            </div>
            <CardDescription className="text-amber-200/70">
              {t("vipLockedHint", { count: vipCount })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/profile"
              className={cn(
                buttonVariants({ size: "sm", variant: "outline" }),
                "border-amber-500/50 text-amber-200 hover:bg-amber-950/40",
              )}
            >
              {t("upgradeVip")}
            </Link>
          </CardContent>
        </Card>
      )}

      <SignalRoom
        signals={signals}
        showCreate={!!session?.user}
        currentUserId={userId ?? null}
        favoriteSymbols={favoriteSymbols}
        initialSymbolFilter={symbol}
        initialAuthorFilter={author}
        initialStatusFilter={status}
        initialPeriodFilter={period}
        initialTzFilter={tz}
        initialTierFilter={tier}
        sort={sort}
        page={page}
        pageSize={SIGNAL_LIST_PAGE_SIZE}
        totalMatching={totalMatching}
        totalUnfiltered={totalUnfiltered}
        hasMore={hasMore}
        newsBySignalId={newsBySignalId}
        newsContextHours={newsContextHours}
      />
      <Disclaimer />
      <PageCtaRow heading={tCommon("ctaDiscovery")} items={ctaRow} />
    </div>
  );
}
