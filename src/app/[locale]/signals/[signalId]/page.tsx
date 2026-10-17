import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChevronDown, MessageCircle, UserRound } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { auth } from "@/auth";
import { Disclaimer } from "@/components/layout/disclaimer";
import { prisma } from "@/lib/prisma";
import { isVipActive } from "@/lib/vip";
import { routing } from "@/i18n/routing";
import {
  DirectionBadge,
  SignalStatusBadge,
  TierBadge,
} from "@/components/ui/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SignalArticleJsonLd } from "@/components/seo/signal-article-json-ld";
import { SignalImageGallery } from "@/components/signals/signal-image-gallery";
import { SignalNewsContext } from "@/components/signals/signal-news-context";
import { TraderPerformanceCard } from "@/components/profile/trader-performance-card";
import { FollowButton } from "@/components/social/follow-button";
import {
  getNewsContextHours,
  getNewsContextWindow,
  getUpcomingHighImpactEvents,
} from "@/lib/calendar/news-context-db";
import { symbolToCurrencies } from "@/lib/signals/symbol-currencies";
import { signalStatusLabel, signalTierLabel } from "@/lib/signals/signal-detail-meta";
import { getVipTierWinRateStats } from "@/lib/signals/vip-win-rate";
import { VipSignalTeaser } from "@/components/signals/vip-signal-teaser";
import { absoluteUrl } from "@/lib/site-url";
import { signalLevelDetail } from "@/components/signals/signal-level-classes";
import { SignalShareCopy } from "@/components/signals/signal-share-copy";
import { SignalCloseForm } from "@/components/signals/signal-close-form";
import { SignalEditForm } from "@/components/signals/signal-edit-form";
import { RiskCalculator } from "@/components/tools/risk-calculator";
import { SignalReactions } from "./signal-reactions";
import { SignalComments } from "./signal-comments";
import { PinSignalButton } from "@/components/signals/pin-signal-button";
import { CopyToJournalButton } from "@/components/signals/copy-to-journal-button";
import { SignalMt5OrderCard } from "@/components/signals/signal-mt5-order-card";
import { isAtPinLimit } from "@/lib/signals/pin-signal-limit";
import { cn } from "@/lib/utils";

const SIGNAL_EDIT_WINDOW_MS = 48 * 60 * 60 * 1000;

function auditFieldLabel(field: string, t: (key: string) => string) {
  switch (field) {
    case "stopLoss":
      return t("slField");
    case "takeProfit":
      return t("tp1Field");
    case "takeProfit2":
      return t("tp2Field");
    case "takeProfit3":
      return t("tp3Field");
    case "notes":
      return t("notes");
    default:
      return field;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; signalId: string }>;
}): Promise<Metadata> {
  const { locale, signalId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("signals");
  const signal = await prisma.signal.findUnique({
    where: { id: signalId },
    select: {
      symbol: true,
      direction: true,
      status: true,
      tier: true,
      createdAt: true,
      updatedAt: true,
      author: { select: { name: true, email: true } },
      images: {
        take: 1,
        orderBy: { sortOrder: "asc" as const },
        select: { url: true },
      },
    },
  });
  if (!signal) {
    return { title: t("title") };
  }
  const statusText = signalStatusLabel(t, signal.status);
  const tierText = signalTierLabel(t, signal.tier);
  const description = t("detailMetaDescription", {
    symbol: signal.symbol,
    direction: signal.direction,
    status: statusText,
    tier: tierText,
  });
  const title = t("detailMetaTitle", {
    symbol: signal.symbol,
    direction: signal.direction,
  });
  const canonical = absoluteUrl(`/signals/${signalId}`, locale);
  const languageUrls = Object.fromEntries(
    routing.locales.map((l) => [l, absoluteUrl(`/signals/${signalId}`, l)]),
  ) as Record<string, string>;
  const ogImage = signal.tier === "FREE" ? signal.images[0]?.url : undefined;
  const imageAlt = t("detailMetaOgImageAlt", {
    symbol: signal.symbol,
    direction: signal.direction,
  });
  const authorName = signal.author.name ?? signal.author.email ?? "Social Forex";
  return {
    title,
    description,
    authors: [{ name: authorName }],
    keywords: [signal.symbol, signal.direction, statusText, tierText, "forex signal"],
    alternates: {
      canonical,
      languages: {
        ...languageUrls,
        "x-default": absoluteUrl(`/signals/${signalId}`, routing.defaultLocale),
      },
    },
    openGraph: {
      type: "article",
      siteName: "Social Forex",
      title,
      description,
      url: canonical,
      publishedTime: signal.createdAt.toISOString(),
      modifiedTime: signal.updatedAt.toISOString(),
      authors: [authorName],
      section: "Signals",
      tags: [signal.symbol, signal.direction, statusText, tierText],
      ...(ogImage ? { images: [{ url: ogImage, alt: imageAlt }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

export const dynamic = "force-dynamic";

export default async function SignalDetailPage({
  params,
}: {
  params: Promise<{ locale: string; signalId: string }>;
}) {
  const { locale, signalId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("signals");
  const tProfile = await getTranslations("profile");

  const session = await auth();
  const userId = session?.user?.id;

  const dbUser = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { vipUntil: true, role: true },
      })
    : null;

  const isMod = dbUser?.role === "MOD" || dbUser?.role === "ADMIN";

  const commentWhere =
    isMod === true
      ? {}
      : userId
        ? {
            OR: [
              { hidden: false },
              { AND: [{ hidden: true }, { authorId: userId }] },
            ],
          }
        : { hidden: false };

  const signal = await prisma.signal.findUnique({
    where: { id: signalId },
    include: {
      author: { select: { id: true, name: true, email: true } },
      reactions: { select: { userId: true, type: true } },
      comments: {
        where: commentWhere,
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true, email: true } } },
      },
      images: { orderBy: { sortOrder: "asc" }, select: { url: true } },
      editLogs: {
        orderBy: { createdAt: "desc" },
        take: 40,
      },
    },
  });

  if (!signal) notFound();

  const canViewVip = isVipActive(dbUser?.vipUntil);
  const masked =
    signal.tier === "VIP" && !canViewVip && userId !== signal.authorId;
  const vipWinRate = masked ? await getVipTierWinRateStats() : null;
  const vipWinRateLabel = vipWinRate
    ? t("vipWinRateStat", {
        rate: vipWinRate.winRate,
        count: vipWinRate.closedCount,
      })
    : null;
  const shareUrl = absoluteUrl(`/signals/${signalId}`, locale);
  const metaDescription = t("detailMetaDescription", {
    symbol: signal.symbol,
    direction: signal.direction,
    status: signalStatusLabel(t, signal.status),
    tier: signalTierLabel(t, signal.tier),
  });
  const metaTitle = t("detailMetaTitle", {
    symbol: signal.symbol,
    direction: signal.direction,
  });
  const imageCount = signal.images.length;
  const imageUrls = masked ? [] : signal.images.map((i) => i.url);
  const isAuthor = userId === signal.authorId;
  const editDeadline = new Date(
    signal.createdAt.getTime() + SIGNAL_EDIT_WINDOW_MS,
  );
  const editLogs = !masked && signal.editLogs.length > 0 ? signal.editLogs : [];

  const likes = signal.reactions.filter((r) => r.type === "LIKE").length;
  const dislikes = signal.reactions.filter((r) => r.type === "DISLIKE").length;
  const userReaction = userId
    ? signal.reactions.find((r) => r.userId === userId)?.type ?? null
    : null;

  const [existingPin, pinCount, following, mt5Connection] = userId
    ? await Promise.all([
        prisma.userPinnedSignal.findUnique({
          where: { userId_signalId: { userId, signalId } },
          select: { id: true },
        }),
        prisma.userPinnedSignal.count({ where: { userId } }),
        prisma.userFollow.findUnique({
          where: {
            followerId_followingId: {
              followerId: userId,
              followingId: signal.authorId,
            },
          },
          select: { id: true },
        }),
        prisma.mt5Connection.findFirst({
          where: { userId, revokedAt: null },
          select: { balance: true },
          orderBy: { lastSeenAt: "desc" },
        }),
      ])
    : [null, 0, null, null];
  const isPinned = !!existingPin;
  const atPinLimit = isAtPinLimit(pinCount);
  const canContactAuthor = !!userId && !isAuthor;
  const isFollowingAuthor = !!following;

  const comments = signal.comments.map((c) => ({
    id: c.id,
    body: c.body,
    authorLabel: c.author.name ?? c.author.email ?? "—",
    authorId: c.author.id,
    createdAt: c.createdAt.toISOString(),
    hidden: c.hidden,
  }));

  const newsCurrencies = symbolToCurrencies(signal.symbol);
  const windowHours = getNewsContextHours();
  const { from: newsFrom, to: newsTo } = getNewsContextWindow();
  const newsEvents =
    newsCurrencies.length > 0
      ? await getUpcomingHighImpactEvents({
          currencies: newsCurrencies,
          from: newsFrom,
          to: newsTo,
        })
      : [];

  const authorName =
    signal.author.name ?? signal.author.email ?? t("authorFallback");
  const statusText = signalStatusLabel(t, signal.status);
  const tierText = signalTierLabel(t, signal.tier);
  const createdAtText = new Date(signal.createdAt).toLocaleString(locale);
  const closedAtText = signal.closedAt
    ? new Date(signal.closedAt).toLocaleString(locale)
    : null;

  return (
    <div className="space-y-6">
      <SignalArticleJsonLd
        url={shareUrl}
        headline={metaTitle}
        description={metaDescription}
        datePublished={signal.createdAt.toISOString()}
        authorName={authorName}
        imageUrl={signal.images[0]?.url ?? null}
      />
      <Link
        href="/signals"
        className="inline-block text-sm text-muted-foreground hover:text-foreground"
      >
        {t("back")}
      </Link>

      <Card className="border-border/60">
        <CardContent className="space-y-5 pt-6">
          <div className="flex flex-col gap-4 border-b border-border/40 pb-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-mono text-xl font-semibold tracking-tight text-foreground">
                  {signal.symbol}
                </h1>
                <DirectionBadge direction={signal.direction} />
                <TierBadge tier={signal.tier} label={tierText} />
                <SignalStatusBadge status={signal.status} label={statusText} />
              </div>
              <p className="text-sm text-muted-foreground">
                {authorName} · {createdAtText}
              </p>
              {signal.status !== "ACTIVE" && closedAtText ? (
                <p className="text-sm text-muted-foreground">
                  {t("closedAtLabel")} {closedAtText}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              {!isAuthor ? (
                <Link
                  href={`/u/${signal.authorId}`}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "h-9 gap-1.5 text-[0.8rem]",
                  )}
                  aria-label={t("authorProfileAria", { name: authorName })}
                >
                  <UserRound className="size-3.5" aria-hidden />
                  <span className="hidden sm:inline">{t("authorProfile")}</span>
                </Link>
              ) : null}
              {canContactAuthor ? (
                <>
                  <FollowButton
                    userId={signal.authorId}
                    isFollowing={isFollowingAuthor}
                    className="h-9"
                  />
                  <Link
                    href={`/messages/${signal.authorId}`}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "h-9 gap-1.5 text-[0.8rem]",
                    )}
                  >
                    <MessageCircle className="size-3.5" aria-hidden />
                    <span className="hidden sm:inline">{t("messageAuthor")}</span>
                  </Link>
                </>
              ) : null}
              <SignalReactions
                signalId={signalId}
                likes={likes}
                dislikes={dislikes}
                userReaction={userReaction}
                loggedIn={!!userId}
              />
              <PinSignalButton
                signalId={signalId}
                signalSymbol={signal.symbol}
                isPinned={isPinned}
                loggedIn={!!userId}
                atLimit={atPinLimit}
              />
              {!isAuthor && !masked ? (
                <CopyToJournalButton
                  signalId={signalId}
                  symbol={signal.symbol}
                  direction={signal.direction}
                  entry={signal.entry}
                  stopLoss={signal.stopLoss}
                  takeProfit={signal.takeProfit}
                  loggedIn={!!userId}
                />
              ) : null}
              {isAuthor ? (
                <SignalShareCopy
                  show
                  symbol={signal.symbol}
                  direction={signal.direction}
                  tier={signal.tier}
                  status={signal.status}
                  entry={signal.entry}
                  stopLoss={signal.stopLoss}
                  takeProfit={signal.takeProfit}
                  takeProfit2={signal.takeProfit2}
                  takeProfit3={signal.takeProfit3}
                  notes={signal.notes}
                  signalUrl={shareUrl}
                />
              ) : null}
            </div>
          </div>

          <SignalImageGallery
            imageUrls={imageUrls}
            imageCount={imageCount}
            masked={masked}
          />

          {masked ? (
            <VipSignalTeaser
              signalId={signal.id}
              surface="signal_detail"
              variant="detailed"
              title={t("maskedTitle")}
              message={t("maskedMessage")}
              ctaLabel={t("upgradeVipCta")}
              winRateLabel={vipWinRateLabel}
            />
          ) : (
            <>
              <section
                className="space-y-3"
                aria-labelledby="signal-levels-heading"
              >
                <h2
                  id="signal-levels-heading"
                  className="text-sm font-medium text-foreground"
                >
                  {t("detailLevelsTitle")}
                </h2>
                <dl className="grid gap-3 font-mono text-sm sm:grid-cols-2">
                  <div className={signalLevelDetail.entry.box}>
                    <dt className={signalLevelDetail.entry.label}>
                      {t("entryField")}
                    </dt>
                    <dd className={signalLevelDetail.entry.value}>
                      {signal.entry}
                    </dd>
                  </div>
                  <div className={signalLevelDetail.sl.box}>
                    <dt className={signalLevelDetail.sl.label}>{t("slField")}</dt>
                    <dd className={signalLevelDetail.sl.value}>
                      {signal.stopLoss ?? "—"}
                    </dd>
                  </div>
                </dl>
                <dl className="grid gap-3 font-mono text-sm sm:grid-cols-3">
                  <div className={signalLevelDetail.tp1.box}>
                    <dt className={signalLevelDetail.tp1.label}>
                      {t("tp1Field")}
                    </dt>
                    <dd className={signalLevelDetail.tp1.value}>
                      {signal.takeProfit ?? "—"}
                    </dd>
                  </div>
                  <div className={signalLevelDetail.tp2.box}>
                    <dt className={signalLevelDetail.tp2.label}>
                      {t("tp2Field")}
                    </dt>
                    <dd className={signalLevelDetail.tp2.value}>
                      {signal.takeProfit2 ?? "—"}
                    </dd>
                  </div>
                  <div className={signalLevelDetail.tp3.box}>
                    <dt className={signalLevelDetail.tp3.label}>
                      {t("tp3Field")}
                    </dt>
                    <dd className={signalLevelDetail.tp3.value}>
                      {signal.takeProfit3 ?? "—"}
                    </dd>
                  </div>
                </dl>
              </section>
              {signal.notes && (
                <section
                  className="rounded-lg border border-border/60 bg-muted/15 p-4"
                  aria-labelledby="signal-analysis-heading"
                >
                  <h2
                    id="signal-analysis-heading"
                    className="text-sm font-medium text-foreground"
                  >
                    {t("detailAnalysisTitle")}
                  </h2>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">
                    {signal.notes}
                  </p>
                </section>
              )}

              {userId && signal.status === "ACTIVE" ? (
                <SignalMt5OrderCard
                  symbol={signal.symbol}
                  direction={signal.direction}
                  entry={signal.entry}
                  stopLoss={signal.stopLoss}
                  takeProfit={signal.takeProfit}
                  connected={!!mt5Connection}
                  balance={mt5Connection?.balance ?? null}
                />
              ) : null}

              <RiskCalculator
                defaultSymbol={signal.symbol}
                defaultEntry={signal.entry}
                defaultStopLoss={signal.stopLoss}
                defaultBalance={mt5Connection?.balance ?? null}
              />
            </>
          )}

          {isAuthor && !masked && signal.status === "ACTIVE" ? (
            <details className="group rounded-lg border border-border/60 bg-muted/10">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-foreground outline-none transition-colors hover:bg-muted/20 focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
                <span>{t("editSectionTitle")}</span>
                <ChevronDown
                  className="size-4 text-muted-foreground transition-transform group-open:rotate-180"
                  aria-hidden
                />
              </summary>
              <div className="border-t border-border/40 p-4">
                <SignalEditForm
                  signalId={signalId}
                  stopLoss={signal.stopLoss}
                  takeProfit={signal.takeProfit}
                  takeProfit2={signal.takeProfit2}
                  takeProfit3={signal.takeProfit3}
                  notes={signal.notes}
                  editDeadlineIso={editDeadline.toISOString()}
                  locale={locale}
                />
              </div>
            </details>
          ) : null}

          {editLogs.length > 0 ? (
            <div className="space-y-2 border-t border-border/40 pt-4">
              <h3 className="text-sm font-medium text-foreground">
                {t("editAuditTitle")}
              </h3>
              <ul className="space-y-1.5 font-mono text-xs text-muted-foreground">
                {editLogs.map((log) => (
                  <li key={log.id}>
                    {new Date(log.createdAt).toLocaleString(locale)} ·{" "}
                    {auditFieldLabel(log.field, t)}:{" "}
                    {log.oldValue ?? "—"} → {log.newValue ?? "—"}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {isAuthor && signal.status === "ACTIVE" ? (
            <section
              className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/10 p-4"
              aria-labelledby="signal-manage-heading"
            >
              <h2
                id="signal-manage-heading"
                className="text-sm font-medium text-foreground"
              >
                {t("detailManageTitle")}
              </h2>
              <SignalCloseForm signalId={signalId} />
            </section>
          ) : null}
        </CardContent>
      </Card>

      {newsCurrencies.length > 0 ? (
        <SignalNewsContext
          events={newsEvents}
          locale={locale}
          windowHours={windowHours}
        />
      ) : null}

      <TraderPerformanceCard
        userId={signal.authorId}
        signalsListHref={`/signals?author=${encodeURIComponent(authorName)}`}
        signalsCtaLabel={tProfile("traderStats.viewSignalsByAuthor")}
      />

      <SignalComments
        signalId={signalId}
        comments={comments}
        loggedIn={!!userId}
        isMod={isMod}
        currentUserId={userId}
        locale={locale}
      />

      <Disclaimer variant="compact" />
    </div>
  );
}
