"use client";

import { useEffect, useState, useTransition } from "react";
import { CheckCircle2, Circle, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { claimOnboardingBonus } from "@/actions/onboarding";
import type { OnboardingStep } from "@/lib/onboarding";

type Status = {
  steps: Record<OnboardingStep, boolean>;
  completedCount: number;
  allDone: boolean;
  bonusClaimed: boolean;
  bonusXp: number;
};

const STEP_LINKS: Record<OnboardingStep, string> = {
  journal: "/journal",
  follow: "/leaderboard",
  alert: "/alerts",
  academy: "/academy",
};

export function OnboardingChecklist() {
  const t = useTranslations("start");
  const [status, setStatus] = useState<Status | null>(null);
  const [justClaimed, setJustClaimed] = useState(false);
  const [claimError, setClaimError] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/onboarding/status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setStatus(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!status || (status.bonusClaimed && !justClaimed)) return null;

  const stepEntries = Object.entries(STEP_LINKS) as [OnboardingStep, string][];
  const total = stepEntries.length;

  function handleClaim() {
    setClaimError(false);
    startTransition(async () => {
      const result = await claimOnboardingBonus();
      if (result.ok) {
        setJustClaimed(true);
        setStatus((prev) => (prev ? { ...prev, bonusClaimed: true } : prev));
      } else {
        setClaimError(true);
      }
    });
  }

  return (
    <section className="rounded-xl border border-border bg-card/40 p-5 ring-1 ring-foreground/5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-base font-medium text-foreground">
          {t("onboardingTitle")}
        </h2>
        <span className="text-xs text-muted-foreground">
          {t("onboardingProgress", { done: status.completedCount, total })}
        </span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("onboardingDesc", { xp: status.bonusXp })}
      </p>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${(status.completedCount / total) * 100}%` }}
        />
      </div>

      <ul className="mt-4 space-y-2">
        {stepEntries.map(([step, href]) => {
          const done = status.steps[step];
          const label = t(`onboardingStep_${step}`);
          return (
            <li key={step}>
              {done ? (
                <span className="flex items-center gap-2 text-sm text-muted-foreground line-through decoration-muted-foreground/50">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
                  {label}
                </span>
              ) : (
                <Link
                  href={href}
                  className="flex items-center gap-2 text-sm text-foreground hover:text-primary"
                >
                  <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ul>

      {justClaimed ? (
        <p className="mt-4 flex items-center gap-1.5 text-sm font-medium text-green-600 dark:text-green-400">
          <Sparkles className="h-4 w-4" />
          {t("onboardingClaimed", { xp: status.bonusXp })}
        </p>
      ) : (
        status.allDone && (
          <div className="mt-4">
            <Button size="sm" onClick={handleClaim} disabled={isPending} className="gap-1.5">
              <Sparkles className="h-4 w-4" />
              {isPending
                ? t("onboardingClaiming")
                : t("onboardingClaim", { xp: status.bonusXp })}
            </Button>
            {claimError && (
              <p className="mt-2 text-sm text-destructive">{t("onboardingClaimError")}</p>
            )}
          </div>
        )
      )}
    </section>
  );
}
