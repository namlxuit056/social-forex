import { getTranslations, setRequestLocale } from "next-intl/server";
import { CheckCircle2, Circle, Gift } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignupPrompt } from "@/components/analytics/signup-prompt";
import { Disclaimer } from "@/components/layout/disclaimer";
import { ExnessBonusClaimForm } from "@/components/exness-bonus/claim-form";
import { getExnessAffiliateUrl } from "@/lib/exness-affiliate";
import {
  EXNESS_BONUS_AMOUNT_USD,
  isEligibleExnessBridge,
  isExnessAccount,
  isExnessDemoServer,
} from "@/lib/exness-bonus";
import { cn } from "@/lib/utils";

const AFFILIATE_REL = "noopener noreferrer sponsored nofollow" as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("exnessBonus");
  return {
    title: t("title", { amount: EXNESS_BONUS_AMOUNT_USD }),
    description: t("subtitle", { amount: EXNESS_BONUS_AMOUNT_USD }),
  };
}

export const dynamic = "force-dynamic";

function Step({ done, title, children }: { done: boolean; title: string; children?: React.ReactNode }) {
  const Icon = done ? CheckCircle2 : Circle;
  return (
    <li className="flex gap-3">
      <Icon className={cn("mt-0.5 size-5 shrink-0", done ? "text-success" : "text-muted-foreground")} aria-hidden />
      <div className="min-w-0 flex-1 space-y-2">
        <p className="font-medium text-foreground">{title}</p>
        {children}
      </div>
    </li>
  );
}

export default async function ExnessBonusPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("exnessBonus");
  const amount = EXNESS_BONUS_AMOUNT_USD;
  const affiliateUrl = getExnessAffiliateUrl();
  const session = await auth();
  const userId = session?.user?.id;

  const [connections, claim] = userId
    ? await Promise.all([
        prisma.mt5Connection.findMany({
          where: { userId, revokedAt: null },
          select: {
            id: true,
            name: true,
            revokedAt: true,
            lastSeenAt: true,
            accountLogin: true,
            accountServer: true,
            accountCompany: true,
          },
          orderBy: { lastSeenAt: { sort: "desc", nulls: "last" } },
        }),
        prisma.exnessBonusClaim.findUnique({ where: { userId } }),
      ])
    : [[], null];

  const eligible = connections.filter((c) => isEligibleExnessBridge(c) && !isExnessDemoServer(c.accountServer));
  const hasExnessAccount = connections.some((c) => isExnessAccount(c));
  const bridgeDone = eligible.length > 0;
  const claimDone = claim != null && claim.status !== "REJECTED";

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="flex items-center gap-2 font-heading text-xl font-semibold text-foreground">
          <Gift className="size-5 text-brand" aria-hidden />
          {t("title", { amount })}
        </h1>
        <p className="text-muted-foreground">{t("subtitle", { amount })}</p>
      </header>

      {!userId && (
        <SignupPrompt
          surface="exness-bonus"
          signInHref="/auth/signin?callbackUrl=/exness-bonus"
          title={t("signupTitle", { amount })}
          description={t("signupDesc")}
          ctaLabel={t("signupCta")}
        />
      )}

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base">{t("stepsTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-5">
            <Step done={Boolean(userId)} title={t("step1")} />
            <Step done={hasExnessAccount} title={t("step2")}>
              <p className="text-sm text-muted-foreground">{t("step2Desc")}</p>
              <a
                href={affiliateUrl}
                target="_blank"
                rel={AFFILIATE_REL}
                className={cn(buttonVariants({ size: "sm" }))}
              >
                {t("openExness")}
              </a>
            </Step>
            <Step done={bridgeDone} title={t("step3")}>
              <p className="text-sm text-muted-foreground">{t("step3Desc")}</p>
              {userId && connections.length > 0 && (
                <ul className="space-y-1 text-sm">
                  {connections.map((c) => {
                    const ok = eligible.some((e) => e.id === c.id);
                    return (
                      <li key={c.id} className="flex flex-wrap items-center gap-2">
                        <span className="font-mono">{c.accountLogin ?? "—"}</span>
                        <span className="text-muted-foreground">{c.accountServer ?? c.name}</span>
                        <span className={cn("text-xs", ok ? "text-success" : "text-muted-foreground")}>
                          {ok
                            ? t("bridgeOk")
                            : !isExnessAccount(c)
                              ? t("bridgeNotExness")
                              : isExnessDemoServer(c.accountServer)
                                ? t("bridgeDemo")
                                : t("bridgeStale")}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
              <Link href="/mt5" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                {t("setupBridge")}
              </Link>
            </Step>
            <Step done={claimDone} title={t("step4", { amount })}>
              {claim && (
                <div className="space-y-1 rounded-md border border-border p-3 text-sm">
                  <p>
                    {t("claimStatus")}: <span className="font-medium">{t(`status.${claim.status}`)}</span>
                  </p>
                  <p className="text-muted-foreground">
                    {t("claimAccount")}: <span className="font-mono">{claim.accountLogin}</span>
                  </p>
                  {claim.adminNote && (
                    <p className="text-muted-foreground">
                      {t("adminNote")}: {claim.adminNote}
                    </p>
                  )}
                </div>
              )}
              {userId && !claimDone && bridgeDone && (
                <ExnessBonusClaimForm
                  connections={eligible.map((c) => ({
                    id: c.id,
                    label: `${c.accountLogin} · ${c.accountServer ?? c.accountCompany ?? ""}`,
                  }))}
                />
              )}
              {userId && !claimDone && !bridgeDone && (
                <p className="text-sm text-muted-foreground">{t("needBridgeFirst")}</p>
              )}
            </Step>
          </ol>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base">{t("termsTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {/* TODO: xác nhận với chủ dự án điều kiện nạp tối thiểu / khối lượng giao dịch tối thiểu (chưa áp dụng) */}
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>{t("terms1")}</li>
            <li>{t("terms2")}</li>
            <li>{t("terms3")}</li>
            <li>{t("terms4", { amount })}</li>
            <li>{t("terms5")}</li>
          </ul>
        </CardContent>
      </Card>

      <Disclaimer />
    </div>
  );
}
