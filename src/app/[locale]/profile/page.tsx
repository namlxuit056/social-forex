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
        <PageCtaRow heading={tc("next")} items={ctaRow} />
      </div>
    );
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { vipUntil: true },
  });
  const vip = isVipActive(dbUser?.vipUntil);

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
          <div className="flex gap-4">
            <dt className="text-muted-foreground">{t("vip")}</dt>
            <dd className={vip ? "text-primary" : "text-muted-foreground"}>
              {vip
                ? t("vipActive", { date: dbUser?.vipUntil?.toLocaleDateString(locale) ?? "" })
                : t("vipInactive")}
            </dd>
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
      <PageCtaRow heading={tc("next")} items={ctaRow} />
    </div>
  );
}
