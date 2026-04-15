"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { closeSignal } from "@/actions/signals";
import { Button } from "@/components/ui/button";

const closeInitial: { error?: string; ok?: boolean } | null = null;

export function SignalCloseForm({ signalId }: { signalId: string }) {
  const t = useTranslations("signals");
  const [state, formAction] = useActionState(closeSignal, closeInitial);
  return (
    <form action={formAction} className="inline-flex flex-wrap gap-1.5">
      <input type="hidden" name="signalId" value={signalId} />
      {state?.error ? (
        <span className="w-full text-destructive">{state.error}</span>
      ) : null}
      <Button
        type="submit"
        name="status"
        value="CLOSED_WIN"
        size="sm"
        variant="outline"
        className="h-8 gap-1 px-2 text-xs text-emerald-400 hover:text-emerald-300"
      >
        {t("closeTpHit")}
      </Button>
      <Button
        type="submit"
        name="status"
        value="CLOSED_LOSS"
        size="sm"
        variant="outline"
        className="h-8 gap-1 px-2 text-xs text-destructive hover:text-red-400"
      >
        {t("closeSlHit")}
      </Button>
      <Button
        type="submit"
        name="status"
        value="CANCELLED"
        size="sm"
        variant="ghost"
        className="h-8 gap-1 px-2 text-xs"
      >
        {t("closeCancelSignal")}
      </Button>
    </form>
  );
}
