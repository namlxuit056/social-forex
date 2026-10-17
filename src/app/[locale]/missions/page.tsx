import { getTranslations, setRequestLocale } from "next-intl/server";
import { CheckCircle2, Circle, Lock, Sparkles, Trophy } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/layout/empty-state";
import { SignupPrompt } from "@/components/analytics/signup-prompt";
import { Disclaimer } from "@/components/layout/disclaimer";
import { MissionClaimButton } from "@/components/missions/mission-claim-button";
import { MISSION_TIERS, MISSIONS_BY_ID, TOTAL_MISSION_XP, missionsForTier } from "@/lib/missions/definitions";
import { getMissionBoard } from "@/lib/missions/query";
import { getLevel } from "@/lib/xp";
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("missions");
  return { title: t("title"), description: t("subtitle") };
}

export const dynamic = "force-dynamic";

function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

export default async function MissionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("missions");
  const lang = locale === "en" ? "en" : "vi";

  const session = await auth();
  if (!session?.user?.id) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-xl font-semibold text-foreground">{t("title")}</h1>
          <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
        </div>
        <EmptyState
          title={t("loginRequired")}
          description={t("loginHint")}
          primary={{ href: "/auth/signin?callbackUrl=/missions", label: t("loginRequired") }}
        />
        <SignupPrompt
          surface="missions"
          title={t("signupPromptTitle")}
          description={t("signupPromptDesc")}
          ctaLabel={t("signupPromptCta")}
          href="/auth/register?callbackUrl=/missions"
        />
      </div>
    );
  }

  const [board, dbUser] = await Promise.all([
    getMissionBoard(session.user.id),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { xp: true } }),
  ]);
  const missionState = new Map(board.missions.map((m) => [m.id, m]));
  const userXp = dbUser?.xp ?? 0;

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground md:text-3xl">
          {t("title")}
        </h1>
        <p className="max-w-2xl text-muted-foreground">{t("subtitle")}</p>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground/90">{t("intro")}</p>
      </header>

      <Card className="border-border/70">
        <CardContent className="flex flex-wrap items-center gap-6 pt-6">
          <div>
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {board.claimedCount}/{board.totalCount}
            </p>
            <p className="text-xs text-muted-foreground">{t("summaryDone")}</p>
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              +{board.earnedXp}
            </p>
            <p className="text-xs text-muted-foreground">{t("summaryEarnedXp")}</p>
          </div>
          <div>
            <p
              className={cn(
                "text-2xl font-bold tabular-nums",
                board.claimableXp > 0 ? "text-primary" : "text-foreground",
              )}
            >
              +{board.claimableXp}
            </p>
            <p className="text-xs text-muted-foreground">{t("summaryClaimableXp")}</p>
          </div>
          <div>
            <p className="inline-flex items-center gap-1.5 text-2xl font-bold tabular-nums text-foreground">
              <Trophy className="size-5 text-amber-500" aria-hidden />
              {getLevel(userXp)}
            </p>
            <p className="text-xs text-muted-foreground">{t("summaryLevel")}</p>
          </div>
          <div className="min-w-40 flex-1">
            <ProgressBar value={board.claimedCount} total={board.totalCount} />
            <p className="mt-1.5 text-xs text-muted-foreground">
              {t("summaryTotalXp", { xp: TOTAL_MISSION_XP })}
            </p>
          </div>
        </CardContent>
      </Card>

      {MISSION_TIERS.map((tier) => {
        const defs = missionsForTier(tier);
        const claimedInTier = defs.filter((d) => missionState.get(d.id)?.claimed).length;
        return (
          <section key={tier} className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-heading text-lg font-semibold text-foreground">
                {t(`tier.${tier}`)}
              </h2>
              <span className="text-xs text-muted-foreground">
                {claimedInTier}/{defs.length}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{t(`tierDesc.${tier}`)}</p>

            <div className="grid gap-3 sm:grid-cols-2">
              {defs.map((def) => {
                const st = missionState.get(def.id)!;
                const copy = MISSIONS_BY_ID[def.id].copy[lang];
                return (
                  <Card
                    key={def.id}
                    className={cn(
                      "border-border/70",
                      st.claimed && "border-emerald-500/30 bg-emerald-500/5",
                      st.complete && !st.claimed && "border-primary/40 bg-primary/5",
                    )}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-start gap-2 text-sm font-medium">
                        {st.claimed ? (
                          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                        ) : st.complete ? (
                          <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                        ) : (
                          <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                        )}
                        <span className={cn(st.claimed && "text-muted-foreground line-through decoration-muted-foreground/40")}>
                          {copy.title}
                        </span>
                        <span className="ml-auto shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                          +{def.xp}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-xs leading-relaxed text-muted-foreground">{copy.desc}</p>

                      {def.target > 1 && !st.claimed && (
                        <div className="space-y-1">
                          <ProgressBar value={st.value} total={st.target} />
                          <p className="text-[11px] tabular-nums text-muted-foreground">
                            {st.value}/{st.target}
                          </p>
                        </div>
                      )}

                      {st.claimed ? (
                        <p className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          <Sparkles className="size-3.5" aria-hidden />
                          {t("claimedToast", { xp: def.xp })}
                        </p>
                      ) : st.complete ? (
                        <MissionClaimButton missionId={def.id} xp={def.xp} />
                      ) : (
                        <Link
                          href={def.href}
                          className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "text-xs")}
                        >
                          {t("startCta")}
                        </Link>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        );
      })}

      {board.claimedCount === board.totalCount && (
        <section className="rounded-xl border border-emerald-500/30 bg-emerald-500/8 p-5 ring-1 ring-emerald-500/10">
          <h2 className="inline-flex items-center gap-2 font-heading text-lg font-semibold text-foreground">
            <Trophy className="size-5 text-amber-500" aria-hidden />
            {t("allDoneTitle")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("allDoneBody")}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/journal" className={cn(buttonVariants({ size: "sm" }))}>
              {t("allDoneCtaJournal")}
            </Link>
            <Link href="/academy" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              {t("allDoneCtaAcademy")}
            </Link>
          </div>
        </section>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Lock className="size-3.5" aria-hidden />
        {t("verifiedNote")}
      </div>

      <Disclaimer variant="compact" />
    </div>
  );
}
