"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LossStreakGuard } from "@/components/journal/loss-streak-guard";
import type { BestSetupInfo } from "@/lib/journal/setups";
import { JournalFormCard } from "./journal-form";

type PrefillData = {
  symbol?: string;
  direction?: string;
  entry?: string;
  stopLoss?: string;
  takeProfit?: string;
  from?: string;
};

export function JournalHeader({
  prefill,
  bestSetup,
}: {
  prefill?: PrefillData;
  bestSetup?: BestSetupInfo | null;
}) {
  const t = useTranslations("journal");
  const [open, setOpen] = useState(!!prefill?.symbol);
  const [overrodeLossStreakGuard, setOverrodeLossStreakGuard] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-xl font-semibold text-foreground">
            {t("title")}
          </h1>
          <p className="mt-2 text-muted-foreground">{t("description")}</p>
        </div>
        {!open && (
          <LossStreakGuard onOverride={() => setOverrodeLossStreakGuard(true)}>
            <Button onClick={() => setOpen(true)} className="shrink-0 gap-1.5">
              <Plus className="size-4" />
              {t("addTrade")}
            </Button>
          </LossStreakGuard>
        )}
      </div>

      {open && (
        <JournalFormCard
          onClose={() => setOpen(false)}
          prefill={prefill}
          bestSetup={bestSetup}
          overrodeLossStreakGuard={overrodeLossStreakGuard}
        />
      )}
    </div>
  );
}
