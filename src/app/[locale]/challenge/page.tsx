import {
  Award,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Lock,
  Trophy,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import {
  completeDemoChallengeDay,
  startDemoChallenge,
} from "@/actions/demo-challenge";
import { DEMO_CHALLENGE_DAYS, DEMO_CHALLENGE_REWARD_DAYS } from "@/lib/demo-challenge";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Disclaimer } from "@/components/layout/disclaimer";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

const dayItems = [1, 2, 3, 4, 5, 6, 7] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("challenge");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function ChallengePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("challenge");
  const tc = await getTranslations("common");
  const session = await auth();
  const userId = session?.user?.id;

  const [progress, user] = userId
    ? await Promise.all([
        prisma.userDemoChallenge.findUnique({ where: { userId } }),
        prisma.user.findUnique({
          where: { id: userId },
          select: { vipUntil: true },
        }),
      ])
    : [null, null];

  const completedDays = new Set(progress?.completedDays ?? []);
  const completedCount = completedDays.size;
  const rewardGranted = Boolean(progress?.rewardGrantedAt);
  const hasStarted = Boolean(progress);
  const vipUntilLabel = user?.vipUntil
    ? user.vipUntil.toLocaleDateString(locale)
    : null;

  return (
    <div className="space-y-10">
      <section className="border-b border-border pb-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-medium text-primary">
              {t("eyebrow")}
            </p>
            <h1 className="mt-4 font-heading text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
              {t("title")}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
              {t("subtitle")}
            </p>
          </div>
          <div className="grid gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm sm:min-w-72">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">{t("progressLabel")}</span>
              <span className="font-mono font-semibold text-foreground">
                {completedCount}/{DEMO_CHALLENGE_DAYS}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-background ring-1 ring-border">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{
                  width: `${Math.round((completedCount / DEMO_CHALLENGE_DAYS) * 100)}%`,
                }}
              />
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {rewardGranted
                ? t("rewardGranted", { days: DEMO_CHALLENGE_REWARD_DAYS })
                : t("rewardHint", { days: DEMO_CHALLENGE_REWARD_DAYS })}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {userId ? (
            hasStarted ? (
              <Badge className="h-9 bg-primary/15 px-3 text-primary hover:bg-primary/20">
                <CalendarDays className="size-4" aria-hidden />
                {t("startedBadge")}
              </Badge>
            ) : (
              <form action={startDemoChallenge}>
                <button className={cn(buttonVariants({ size: "lg" }))}>
                  <Trophy className="size-4" aria-hidden />
                  {t("startCta")}
                </button>
              </form>
            )
          ) : (
            <>
              <Link
                href="/auth/register?callbackUrl=/challenge"
                className={cn(buttonVariants({ size: "lg" }))}
              >
                <Trophy className="size-4" aria-hidden />
                {t("guestRegisterCta")}
              </Link>
              <Link
                href="/auth/signin?callbackUrl=/challenge"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
              >
                {tc("signIn")}
              </Link>
            </>
          )}
          <Link
            href="/start"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
          >
            {t("startGuideCta")}
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <ClipboardList className="size-5 text-primary" aria-hidden />
          <h2 className="mt-3 font-heading text-base font-medium text-foreground">
            {t("benefitProcessTitle")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t("benefitProcessDesc")}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <BadgeCheck className="size-5 text-chart-3" aria-hidden />
          <h2 className="mt-3 font-heading text-base font-medium text-foreground">
            {t("benefitHabitTitle")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t("benefitHabitDesc")}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <Award className="size-5 text-chart-4" aria-hidden />
          <h2 className="mt-3 font-heading text-base font-medium text-foreground">
            {t("benefitRewardTitle")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t("benefitRewardDesc", { days: DEMO_CHALLENGE_REWARD_DAYS })}
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground">
            {t("daysTitle")}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {t("daysDesc")}
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {dayItems.map((day) => {
            const complete = completedDays.has(day);
            const title = t(`day${day}Title`);
            const desc = t(`day${day}Desc`);
            return (
              <Card
                key={day}
                className={cn(
                  "border-border bg-card",
                  complete && "border-primary/35 bg-primary/5",
                )}
              >
                <CardHeader className="space-y-3 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Badge variant={complete ? "default" : "outline"}>
                        {t("dayLabel", { day })}
                      </Badge>
                      <CardTitle className="mt-3 font-heading text-base">
                        {title}
                      </CardTitle>
                    </div>
                    {complete ? (
                      <CheckCircle2 className="size-5 shrink-0 text-primary" aria-hidden />
                    ) : null}
                  </div>
                  <CardDescription className="leading-relaxed">
                    {desc}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-2">
                  {userId ? (
                    complete ? (
                      <Badge
                        variant="outline"
                        className="h-9 border-primary/30 px-3 text-primary"
                      >
                        {t("done")}
                      </Badge>
                    ) : (
                      <form action={completeDemoChallengeDay}>
                        <input type="hidden" name="day" value={day} />
                        <button
                          className={cn(
                            buttonVariants({ variant: "secondary", size: "sm" }),
                          )}
                        >
                          {t("completeDayCta")}
                        </button>
                      </form>
                    )
                  ) : (
                    <Badge variant="outline" className="h-9 px-3 text-muted-foreground">
                      <Lock className="size-3.5" aria-hidden />
                      {t("loginToTrack")}
                    </Badge>
                  )}
                  <Link
                    href={day <= 2 ? "/calendar" : day <= 4 ? "/academy" : "/journal"}
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "sm" }),
                      "text-primary hover:text-primary",
                    )}
                  >
                    {t("openToolCta")}
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {rewardGranted ? (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-heading text-lg font-semibold text-foreground">
            {t("rewardTitle")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t("rewardBody", {
              days: DEMO_CHALLENGE_REWARD_DAYS,
              date: vipUntilLabel ?? t("rewardDateFallback"),
            })}
          </p>
          <Link
            href="/signals"
            className={cn(buttonVariants({ size: "sm" }), "mt-4")}
          >
            {t("rewardCta")}
          </Link>
        </section>
      ) : null}

      <Disclaimer />
    </div>
  );
}
