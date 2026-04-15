import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isVipActive } from "@/lib/vip";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SignalImageGallery } from "@/components/signals/signal-image-gallery";
import { SignalNewsContext } from "@/components/signals/signal-news-context";
import {
  getNewsContextHours,
  getNewsContextWindow,
  getUpcomingHighImpactEvents,
} from "@/lib/calendar/news-context-db";
import { symbolToCurrencies } from "@/lib/signals/symbol-currencies";
import { absoluteUrl } from "@/lib/site-url";
import { signalLevelDetail } from "@/components/signals/signal-level-classes";
import { SignalShareCopy } from "@/components/signals/signal-share-copy";
import { SignalReactions } from "./signal-reactions";
import { SignalComments } from "./signal-comments";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; signalId: string }>;
}) {
  const { locale, signalId } = await params;
  setRequestLocale(locale);
  const signal = await prisma.signal.findUnique({
    where: { id: signalId },
    select: { symbol: true, direction: true },
  });
  if (!signal) return { title: "Signal" };
  return { title: `${signal.symbol} ${signal.direction}` };
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
  const imageCount = signal.images.length;
  const imageUrls = masked ? [] : signal.images.map((i) => i.url);

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

  return (
    <div className="space-y-6">
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
            {signal.author.name ?? signal.author.email} ·{" "}
            {new Date(signal.createdAt).toLocaleString(locale)}
          </p>

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

          {userId === signal.authorId ? (
            <div className="flex flex-wrap gap-2 pt-1">
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
    </div>
  );
}
