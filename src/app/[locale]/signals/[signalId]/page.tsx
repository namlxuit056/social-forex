import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { auth } from "@/auth";
import { Disclaimer } from "@/components/layout/disclaimer";
import { prisma } from "@/lib/prisma";
import { isVipActive } from "@/lib/vip";
import { routing } from "@/i18n/routing";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SignalArticleJsonLd } from "@/components/seo/signal-article-json-ld";
import { SignalImageGallery } from "@/components/signals/signal-image-gallery";
import { SignalNewsContext } from "@/components/signals/signal-news-context";
import {
  getNewsContextHours,
  getNewsContextWindow,
  getUpcomingHighImpactEvents,
} from "@/lib/calendar/news-context-db";
import { symbolToCurrencies } from "@/lib/signals/symbol-currencies";
import { signalStatusLabel, signalTierLabel } from "@/lib/signals/signal-detail-meta";
import { absoluteUrl } from "@/lib/site-url";
import { signalLevelDetail } from "@/components/signals/signal-level-classes";
import { SignalShareCopy } from "@/components/signals/signal-share-copy";
import { SignalCloseForm } from "@/components/signals/signal-close-form";
import { SignalEditForm } from "@/components/signals/signal-edit-form";
import { SignalReactions } from "./signal-reactions";
import { SignalComments } from "./signal-comments";

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
  const ogImage = signal.images[0]?.url;
  const imageAlt = t("detailMetaOgImageAlt", {
    symbol: signal.symbol,
    direction: signal.direction,
  });
  return {
    title,
    description,
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

  const signal = await prisma.signal.findUnique({
    where: { id: signalId },
    include: {
      author: { select: { id: true, name: true, email: true } },
      reactions: { select: { userId: true, type: true } },
      comments: {
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

  const session = await auth();
  const userId = session?.user?.id;

  const dbUser = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { vipUntil: true },
      })
    : null;

  const canViewVip = isVipActive(dbUser?.vipUntil);
  const masked =
    signal.tier === "VIP" && !canViewVip && userId !== signal.authorId;
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
  const editLogs =
    isAuthor && signal.editLogs.length > 0 ? signal.editLogs : [];

  const likes = signal.reactions.filter((r) => r.type === "LIKE").length;
  const dislikes = signal.reactions.filter((r) => r.type === "DISLIKE").length;
  const userReaction = userId
    ? signal.reactions.find((r) => r.userId === userId)?.type ?? null
    : null;

  const comments = signal.comments.map((c) => ({
    id: c.id,
    body: c.body,
    authorLabel: c.author.name ?? c.author.email ?? "—",
    authorId: c.author.id,
    createdAt: c.createdAt.toISOString(),
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
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xl font-bold text-foreground">
              {signal.symbol}
            </span>
            <Badge
              variant={signal.direction === "LONG" ? "default" : "destructive"}
            >
              {signal.direction}
            </Badge>
            <Badge
              variant={signal.tier === "VIP" ? "secondary" : "outline"}
            >
              {signal.tier}
            </Badge>
            <Badge variant="outline">{signal.status}</Badge>
          </div>

          <p className="text-sm text-muted-foreground">
            {authorName} · {new Date(signal.createdAt).toLocaleString(locale)}
          </p>
          {signal.status !== "ACTIVE" && signal.closedAt ? (
            <p className="text-sm text-muted-foreground">
              {t("closedAtLabel")}{" "}
              {new Date(signal.closedAt).toLocaleString(locale)}
            </p>
          ) : null}

          <SignalImageGallery
            imageUrls={imageUrls}
            imageCount={imageCount}
            masked={masked}
          />

          {masked ? (
            <p className="text-sm text-amber-400/90">{t("maskedMessage")}</p>
          ) : (
            <>
              <dl className="grid gap-3 font-mono text-sm sm:grid-cols-2">
                <div className={signalLevelDetail.entry.box}>
                  <dt className={signalLevelDetail.entry.label}>
                    {t("entryField")}
                  </dt>
                  <dd className={signalLevelDetail.entry.value}>{signal.entry}</dd>
                </div>
                <div className={signalLevelDetail.sl.box}>
                  <dt className={signalLevelDetail.sl.label}>{t("slField")}</dt>
                  <dd className={signalLevelDetail.sl.value}>
                    {signal.stopLoss ?? "—"}
                  </dd>
                </div>
              </dl>
              <dl className="mt-3 grid gap-3 font-mono text-sm sm:grid-cols-3">
                <div className={signalLevelDetail.tp1.box}>
                  <dt className={signalLevelDetail.tp1.label}>{t("tp1Field")}</dt>
                  <dd className={signalLevelDetail.tp1.value}>
                    {signal.takeProfit ?? "—"}
                  </dd>
                </div>
                <div className={signalLevelDetail.tp2.box}>
                  <dt className={signalLevelDetail.tp2.label}>{t("tp2Field")}</dt>
                  <dd className={signalLevelDetail.tp2.value}>
                    {signal.takeProfit2 ?? "—"}
                  </dd>
                </div>
                <div className={signalLevelDetail.tp3.box}>
                  <dt className={signalLevelDetail.tp3.label}>{t("tp3Field")}</dt>
                  <dd className={signalLevelDetail.tp3.value}>
                    {signal.takeProfit3 ?? "—"}
                  </dd>
                </div>
              </dl>
              {signal.notes && (
                <p className="text-sm text-muted-foreground">{signal.notes}</p>
              )}
            </>
          )}

          {isAuthor && !masked && signal.status === "ACTIVE" ? (
            <div className="space-y-2 pt-2">
              <h3 className="text-sm font-medium text-foreground">
                {t("editSectionTitle")}
              </h3>
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

          {isAuthor ? (
            <div className="flex flex-col gap-3 pt-2">
              {signal.status === "ACTIVE" ? (
                <SignalCloseForm signalId={signalId} />
              ) : null}
              <div className="flex flex-wrap gap-2">
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
              </div>
            </div>
          ) : null}

          <SignalReactions
            signalId={signalId}
            likes={likes}
            dislikes={dislikes}
            userReaction={userReaction}
            loggedIn={!!userId}
          />
        </CardContent>
      </Card>

      {newsCurrencies.length > 0 ? (
        <SignalNewsContext
          events={newsEvents}
          locale={locale}
          windowHours={windowHours}
        />
      ) : null}

      <SignalComments
        signalId={signalId}
        comments={comments}
        loggedIn={!!userId}
      />

      <Disclaimer variant="compact" />
    </div>
  );
}
