import {
  Crown,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  MessageCircle,
  Award,
  User,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isVipActive } from "@/lib/vip";
import { EmptyState } from "@/components/layout/empty-state";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PAYPAL_EMAIL = "namlxuit@gmail.com";

const PLANS = [
  { key: "plan1m" as const, months: 1, price: 5, pricePerMonth: 5 },
  { key: "plan3m" as const, months: 3, price: 12, pricePerMonth: 4, badge: "popular" as const },
  { key: "plan12m" as const, months: 12, price: 36, pricePerMonth: 3, badge: "bestValue" as const },
];

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

      {/* Current status */}
      <div className="rounded-xl border border-border bg-card/50 px-5 py-4">
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

      {/* Pricing cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {PLANS.map((plan) => {
          const paypalUrl = `https://www.paypal.com/paypalme/namlxuit/${plan.price}USD`;
          const isPopular = plan.badge === "popular";

          return (
            <div
              key={plan.key}
              className={cn(
                "relative flex flex-col rounded-2xl border p-6 transition",
                isPopular
                  ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                  : "border-border bg-card/50",
              )}
            >
              {plan.badge && (
                <Badge
                  className={cn(
                    "absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px]",
                    isPopular
                      ? "bg-primary text-primary-foreground"
                      : "bg-yellow-500 text-black",
                  )}
                >
                  {t(plan.badge)}
                </Badge>
              )}

              <h3 className="text-center text-lg font-semibold text-foreground">
                {t(plan.key)}
              </h3>

              <div className="mt-4 text-center">
                <span className="text-3xl font-bold text-foreground">
                  ${plan.price}
                </span>
                <span className="ml-1 text-sm text-muted-foreground">USD</span>
              </div>

              {plan.months > 1 && (
                <p className="mt-1 text-center text-xs text-muted-foreground">
                  ~${plan.pricePerMonth}
                  {t("perMonth")}
                </p>
              )}

              <a
                href={paypalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "mt-6 gap-1.5",
                  isPopular
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground hover:bg-muted/80",
                )}
              >
                <ExternalLink className="size-3.5" />
                {t("paypalButton")}
              </a>
            </div>
          );
        })}
      </div>

      {/* Features */}
      <div className="rounded-xl border border-border bg-card/50 p-6">
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

      {/* Payment instructions */}
      <div className="space-y-4 rounded-xl border border-border bg-card/50 p-6">
        <h2 className="text-lg font-semibold text-foreground">
          {t("howToPay")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("howToPayDesc")}</p>

        <div className="flex items-center gap-3 rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3">
          <span className="text-sm font-medium text-foreground">PayPal:</span>
          <a
            href={`https://www.paypal.com/paypalme/namlxuit`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-sm text-blue-500 underline underline-offset-2"
          >
            {PAYPAL_EMAIL}
          </a>
        </div>

        <p className="text-xs text-muted-foreground">{t("paypalNote")}</p>

        {dbUser?.email && (
          <div className="rounded-lg border border-border bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
            {t("accountEmailLabel")}{" "}
            <strong className="text-foreground">{dbUser.email}</strong>
          </div>
        )}

        <div className="mt-4 flex items-start gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
          <MessageCircle className="mt-0.5 size-4 shrink-0 text-emerald-500" />
          <div>
            <p className="text-sm font-medium text-foreground">
              {t("afterPayment")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("afterPaymentDesc")}
            </p>
          </div>
        </div>
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
