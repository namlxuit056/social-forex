import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isVipActive } from "@/lib/vip";
import { PriceAlertForm } from "./price-alert-form";
import { PriceAlertList } from "./price-alert-list";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("alerts");
  return { title: t("title"), description: t("description") };
}

export const dynamic = "force-dynamic";

export default async function AlertsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("alerts");

  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const userId = session.user.id;

  const [dbUser, alerts] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { vipUntil: true } }),
    prisma.priceAlert.findMany({
      where: { userId },
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
      take: 50,
    }),
  ]);

  const vip = isVipActive(dbUser?.vipUntil);
  const limit = vip ? 20 : 5;
  const activeCount = alerts.filter((a) => a.isActive).length;

  const serialized = alerts.map((a) => ({
    id: a.id,
    symbol: a.symbol,
    targetPrice: a.targetPrice,
    direction: a.direction,
    isActive: a.isActive,
    isRecurring: a.isRecurring,
    cooldownMinutes: a.cooldownMinutes,
    triggeredAt: a.triggeredAt?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Bell className="mt-1 h-5 w-5 text-primary shrink-0" />
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">{t("title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("description")}</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">{t("addAlertSection")}</h2>
          <span className="text-xs text-muted-foreground">
            {activeCount}/{limit} {t("used")}
            {!vip && (
              <span className="ml-1 text-primary">(VIP: 20)</span>
            )}
          </span>
        </div>
        <PriceAlertForm activeCount={activeCount} limit={limit} />
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">{t("myAlerts")}</h2>
        <PriceAlertList alerts={serialized} />
      </div>
    </div>
  );
}
