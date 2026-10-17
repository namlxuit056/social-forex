import {
  Crown,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Award,
  User,
  GraduationCap,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isVipActive } from "@/lib/vip";
import { EmptyState } from "@/components/layout/empty-state";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PayPalVipCheckout } from "@/components/vip/paypal-vip-checkout";
import { VipPricingViewTracker } from "@/components/vip/vip-pricing-view-tracker";
import { getPayPalPublicClientId } from "@/lib/paypal-vip";
import { cn } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("vip");
  return { title: t("title"), description: t("description") };
}

export const dynamic = "force-dynamic";

export default async function UpgradeVipPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("vip");
  const tc = await getTranslations("common");

  const session = await auth();

  if (!session?.user?.id) {
    return (
      <EmptyState
        icon={User}
        title={t("loginRequired")}
        description={t("loginHint")}
        primary={{ href: "/auth/signin?callbackUrl=/upgrade-vip", label: tc("signIn") }}
        secondary={[{ href: "/auth/register", label: tc("signUp") }]}
      />
    );
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, vipUntil: true },
  });
  const vip = isVipActive(dbUser?.vipUntil);

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      {!vip && <VipPricingViewTracker />}
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-yellow-500/10">
          <Crown className="size-7 text-yellow-500" />
        </div>
        <h1 className="font-heading text-3xl font-bold text-foreground">
          {t("title")}
        </h1>
        <p className="mx-auto mt-2 max-w-lg text-muted-foreground">
          {t("description")}
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-5 py-4">
        <GraduationCap className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            {t("educationalTitle")}
          </p>
          <p className="text-sm leading-6 text-muted-foreground">
            {t("educationalDesc")}
          </p>
        </div>
      </div>

      {/* Current status */}
      <div className="rounded-xl border border-border bg-card px-5 py-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {t("currentStatus")}
          </span>
          {vip ? (
            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="mr-1 size-3" />
              {t("active", {
                date: dbUser?.vipUntil?.toLocaleDateString(locale) ?? "",
              })}
            </Badge>
          ) : (
            <Badge variant="secondary">{t("inactive")}</Badge>
          )}
        </div>
      </div>

      <PayPalVipCheckout
        clientId={getPayPalPublicClientId()}
        copy={{
          selectPlan: t("selectPlan"),
          monthly: t("planMonthly"),
          quarterly: t("planQuarterly"),
          perMonth: t("perMonth"),
          popular: t("popular"),
          paypalButtonLoading: t("paypalButtonLoading"),
          paypalConfigured: t("paypalConfigured"),
          paypalMissingConfig: t("paypalMissingConfig"),
          paymentSuccess: t("paymentSuccess"),
          paymentError: t("paymentError"),
        }}
      />

      {/* Features */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Sparkles className="size-5 text-yellow-500" />
          {t("features")}
        </h2>
        <ul className="mt-4 space-y-3">
          {(["feature1", "feature2", "feature3", "feature4", "feature5"] as const).map(
            (key, i) => (
              <li key={key} className="flex items-start gap-3 text-sm">
                {i < 3 ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                ) : i === 3 ? (
                  <Award className="mt-0.5 size-4 shrink-0 text-blue-500" />
                ) : (
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-yellow-500" />
                )}
                <span className="text-foreground/90">{t(key)}</span>
              </li>
            ),
          )}
        </ul>
      </div>

      <div className="space-y-4 rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">
          {t("howToPay")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("howToPayDesc")}</p>

        <p className="text-xs text-muted-foreground">{t("paypalNote")}</p>

        {dbUser?.email && (
          <div className="rounded-lg border border-border bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
            {t("accountEmailLabel")}{" "}
            <strong className="text-foreground">{dbUser.email}</strong>
          </div>
        )}

        <p className="text-xs text-muted-foreground">{t("afterPaymentDesc")}</p>
      </div>

      {/* Back to profile */}
      <div className="text-center">
        <Link
          href="/profile"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "text-muted-foreground",
          )}
        >
          ← {tc("profile")}
        </Link>
      </div>
    </div>
  );
}
