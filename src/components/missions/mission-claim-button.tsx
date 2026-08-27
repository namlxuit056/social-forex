"use client";

import { useState, useTransition } from "react";
import { Check, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { claimMission } from "@/actions/missions";

export function MissionClaimButton({ missionId, xp }: { missionId: string; xp: number }) {
  const t = useTranslations("missions");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [claimed, setClaimed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClaim() {
    setError(null);
    startTransition(async () => {
      const result = await claimMission(missionId);
      if (result.ok) {
        setClaimed(true);
        router.refresh();
      } else {
        setError(t(`claimError.${result.error}`));
      }
    });
  }

  if (claimed) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
        <Sparkles className="size-4" aria-hidden />
        {t("claimedToast", { xp })}
      </span>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button size="sm" onClick={handleClaim} disabled={isPending} className="gap-1.5">
        <Check className="size-4" aria-hidden />
        {isPending ? t("claiming") : t("claimCta", { xp })}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
