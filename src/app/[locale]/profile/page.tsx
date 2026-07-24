import { User } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { auth } from "@/auth";
import { EmptyState } from "@/components/layout/empty-state";
import { PageCtaRow } from "@/components/layout/page-cta-row";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { isVipActive } from "@/lib/vip";
import { pageCtaItems } from "@/lib/page-cta-i18n";
import { updateNotificationSettings } from "@/actions/notifications";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getLevel, getXpProgress } from "@/lib/xp";
import { ProfileReferralSection } from "@/components/profile/referral-section";
import { ChangePasswordForm } from "@/components/profile/change-password-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("profile");
  return { title: t("title") };
}

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("profile");
  const tc = await getTranslations("common");
  const ctaRow = await pageCtaItems("explore", "community");

  const session = await auth();

  if (!session?.user?.id) {
    return (
      <div className="space-y-8">
        <EmptyState
          icon={User}
          title={t("loginTitle")}
          description={t("loginHint")}
          primary={{ href: "/auth/signin?callbackUrl=/profile", label: tc("signIn") }}
          secondary={[{ href: "/auth/register", label: tc("signUp") }]}
        />
        <PageCtaRow heading={tc("ctaDiscovery")} items={ctaRow} />
      </div>
    );
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      vipUntil: true,
      xp: true,
      referralCode: true,
      notifySignalFollow: true,
      notifySignalFavoriteSym: true,
      notifySignalVipBroadcast: true,
    },
  });
  const vip = isVipActive(dbUser?.vipUntil);
  const userXp = dbUser?.xp ?? 0;
  const userLevel = getLevel(userXp);
  const xpProgress = getXpProgress(userXp);

  // Referral stats
  let referralStats = { totalReferred: 0, totalVipDays: 0 };
  if (dbUser?.referralCode) {
    const [totalReferred, referralEvents] = await Promise.all([
      prisma.user.count({ where: { referredById: session.user.id } }),
      prisma.referralEvent.findMany({
        where: { referrerId: session.user.id },
        select: { rewardDays: true },
      }),
    ]);
    referralStats = {
      totalReferred,
      totalVipDays: referralEvents.reduce((sum, e) => sum + e.rewardDays, 0),
    };
  }

  return (
    <div className="space-y-8">
      <h1 className="font-heading text-2xl font-semibold text-foreground">
        {t("title")}
      </h1>
      <div className="rounded-xl border border-border bg-card/50 p-6 ring-1 ring-foreground/5">
        <h2 className="font-medium text-foreground">{t("account")}</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex gap-4">
            <dt className="text-muted-foreground">{t("name")}</dt>
            <dd className="text-foreground">{session.user.name ?? "—"}</dd>
          </div>
          <div className="flex gap-4">
            <dt className="text-muted-foreground">{t("email")}</dt>
            <dd className="text-foreground">{session.user.email ?? "—"}</dd>
          </div>
          <div className="flex flex-wrap gap-2">
            <dt className="text-muted-foreground">{t("publicProfile")}</dt>
            <dd>
              <Link
                href={`/u/${session.user.id}`}
                className={cn(buttonVariants({ variant: "link", size: "sm" }), "h-auto px-0")}
              >
                {t("viewProfile")}
              </Link>
            </dd>
          </div>
          <div className="flex flex-wrap gap-2">
            <dt className="text-muted-foreground">{t("inbox")}</dt>
            <dd>
              <Link
                href="/messages"
                className={cn(buttonVariants({ variant: "link", size: "sm" }), "h-auto px-0")}
              >
                {t("inbox")}
              </Link>
            </dd>
          </div>
          <div className="flex flex-wrap gap-2">
            <dt className="text-muted-foreground">{t("mt5Bridge")}</dt>
            <dd>
              <Link
                href="/mt5"
                className={cn(buttonVariants({ variant: "link", size: "sm" }), "h-auto px-0")}
              >
                {t("manageMt5Bridge")}
              </Link>
            </dd>
          </div>
          <div className="flex gap-4">
            <dt className="text-muted-foreground">{t("vip")}</dt>
            <dd className={vip ? "text-primary" : "text-muted-foreground"}>
              {vip
                ? t("vipActive", { date: dbUser?.vipUntil?.toLocaleDateString(locale) ?? "" })
                : t("vipInactive")}
            </dd>
          </div>
          <div className="flex flex-col gap-1.5 pt-1">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">XP</span>
              <span className="font-semibold text-primary">Lv.{userLevel}</span>
              <span className="text-muted-foreground">·</span>
              <span className="font-mono text-foreground">{userXp} XP</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-40 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">{xpProgress}/100</span>
            </div>
          </div>
        </dl>
        {!vip && (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <p className="flex-1 text-sm text-muted-foreground">{t("upgradeHint")}</p>
            <Link
              href="/upgrade-vip"
              className={cn(buttonVariants({ size: "sm" }), "shrink-0 gap-1.5")}
            >
              {t("upgradeVip")}
            </Link>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card/50 p-6 ring-1 ring-foreground/5">
        <h2 className="font-medium text-foreground">{t("notificationPrefsTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("notificationPrefsHint")}</p>
        <form action={updateNotificationSettings} className="mt-4 space-y-4">
          <div className="flex items-start gap-3">
            <input
              id="notify-follow"
              type="checkbox"
              name="notifySignalFollow"
              value="on"
              defaultChecked={dbUser?.notifySignalFollow ?? true}
              className="mt-1 size-4 rounded border-border"
            />
            <div>
              <Label htmlFor="notify-follow" className="text-sm font-medium">
                {t("notifySignalFollow")}
              </Label>
              <p className="text-xs text-muted-foreground">{t("notifySignalFollowHint")}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <input
              id="notify-fav"
              type="checkbox"
              name="notifySignalFavoriteSym"
              value="on"
              defaultChecked={dbUser?.notifySignalFavoriteSym ?? true}
              className="mt-1 size-4 rounded border-border"
            />
            <div>
              <Label htmlFor="notify-fav" className="text-sm font-medium">
                {t("notifySignalFavoriteSym")}
              </Label>
              <p className="text-xs text-muted-foreground">{t("notifySignalFavoriteSymHint")}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <input
              id="notify-vip-broadcast"
              type="checkbox"
              name="notifySignalVipBroadcast"
              value="on"
              defaultChecked={dbUser?.notifySignalVipBroadcast ?? false}
              disabled={!vip}
              className="mt-1 size-4 rounded border-border disabled:opacity-50"
            />
            <div>
              <Label htmlFor="notify-vip-broadcast" className="text-sm font-medium">
                {t("notifySignalVipBroadcast")}
              </Label>
              <p className="text-xs text-muted-foreground">
                {vip
                  ? t("notifySignalVipBroadcastHint")
                  : t("notifySignalVipBroadcastVipOnly")}
              </p>
            </div>
          </div>
          <Button type="submit" size="sm">
            {t("notificationPrefsSave")}
          </Button>
        </form>
      </div>

      <div className="rounded-xl border border-border bg-card/50 p-6 ring-1 ring-foreground/5">
        <h2 className="font-medium text-foreground">{t("changePasswordTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("changePasswordHint")}</p>
        <ChangePasswordForm />
      </div>

      {dbUser?.referralCode && (
        <ProfileReferralSection
          referralCode={dbUser.referralCode}
          totalReferred={referralStats.totalReferred}
          totalVipDays={referralStats.totalVipDays}
        />
      )}

      <PageCtaRow heading={tc("ctaDiscovery")} items={ctaRow} />
    </div>
  );
}
