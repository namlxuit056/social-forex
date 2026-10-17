import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isVipActive } from "@/lib/vip";
import { ScalpingPanel } from "@/components/scalping/scalping-panel";
import { AutoScalpSettings } from "@/components/scalping/auto-scalp-settings";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("scalping");
  return { title: t("title"), description: t("description") };
}

export default async function ScalpingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("scalping");

  const session = await auth();
  const isLoggedIn = !!session?.user?.id;
  let isVip = false;
  let autoConfig = null;

  if (isLoggedIn) {
    const [dbUser, cfg] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session!.user!.id },
        select: { vipUntil: true },
      }),
      prisma.autoScalpConfig.findUnique({
        where: { userId: session!.user!.id },
        include: { symbols: { orderBy: { createdAt: "asc" } } },
      }),
    ]);
    isVip = isVipActive(dbUser?.vipUntil);
    autoConfig = cfg
      ? {
          enabled: cfg.enabled,
          minScore: cfg.minScore,
          minConfidence: cfg.minConfidence,
          maxPerDay: cfg.maxPerDay,
          symbols: cfg.symbols.map((s) => ({
            id: s.id,
            symbol: s.symbol,
            enabled: s.enabled,
            lotSize: s.lotSize,
            lastTradeAt: s.lastTradeAt,
          })),
        }
      : null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-xl font-semibold text-foreground">{t("title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("description")}</p>
      </div>

      <ScalpingPanel isLoggedIn={isLoggedIn} isVip={isVip} />

      {isVip && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">{t("autoSection")}</h2>
          <AutoScalpSettings initial={autoConfig} isVip={isVip} />
        </div>
      )}
    </div>
  );
}
