import { Lock } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { auth } from "@/auth";
import { SignalRoom } from "@/components/signals/signal-room";
import { Disclaimer } from "@/components/layout/disclaimer";
import { PageCtaRow } from "@/components/layout/page-cta-row";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { isVipActive } from "@/lib/vip";
import { pageCtas } from "@/lib/page-cta-presets";

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
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("signals");
  const tc = await getTranslations("common");

  const session = await auth();
  const userId = session?.user?.id;

  const dbUser = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { vipUntil: true },
      })
    : null;

  const canViewVip = isVipActive(dbUser?.vipUntil);

  const rows = await prisma.signal.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      author: { select: { name: true, email: true } },
      reactions: { select: { type: true } },
      _count: { select: { comments: true } },
      images: { orderBy: { sortOrder: "asc" }, select: { url: true } },
    },
  });

  const vipCount = rows.filter((s) => s.tier === "VIP").length;
  const hasVipSignals = vipCount > 0;

  const signals = rows.map((s) => {
    const masked = s.tier === "VIP" && !canViewVip;
    const imageUrls = masked ? [] : s.images.map((i) => i.url);
    return {
      id: s.id,
      symbol: s.symbol,
      direction: s.direction,
      entry: masked ? null : s.entry,
      stopLoss: masked ? null : s.stopLoss,
      takeProfit: masked ? null : s.takeProfit,
      tier: s.tier,
      status: s.status,
      notes: masked ? null : s.notes,
      masked,
      authorLabel: s.author?.name ?? s.author?.email ?? "—",
      authorId: s.authorId,
      isAuthor: userId === s.authorId,
      likes: s.reactions.filter((r) => r.type === "LIKE").length,
      dislikes: s.reactions.filter((r) => r.type === "DISLIKE").length,
      commentCount: s._count.comments,
      imageUrls,
      imageCount: s.images.length,
      createdAt: s.createdAt.toISOString(),
    };
  });

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

      <SignalRoom signals={signals} showCreate={!!session?.user} />
      <Disclaimer />
      <PageCtaRow heading="→" items={[...pageCtas.trading, ...pageCtas.community]} />
    </div>
  );
}
