"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { updateSignal } from "@/actions/signals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const editInitial: { error?: string; ok?: boolean } | null = null;

export function SignalEditForm({
  signalId,
  stopLoss,
  takeProfit,
  takeProfit2,
  takeProfit3,
  notes,
  editDeadlineIso,
  locale,
}: {
  signalId: string;
  stopLoss: number | null;
  takeProfit: number | null;
  takeProfit2: number | null;
  takeProfit3: number | null;
  notes: string | null;
  editDeadlineIso: string;
  locale: string;
}) {
  const t = useTranslations("signals");
  const router = useRouter();
  const [state, formAction] = useActionState(updateSignal, editInitial);
  const deadline = new Date(editDeadlineIso);
  const deadlineTime = deadline.getTime();
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state?.ok, router]);
  useEffect(() => {
    setExpired(Date.now() > deadlineTime);
  }, [deadlineTime]);

  if (expired) {
    return (
      <p className="text-sm text-muted-foreground">{t("editWindowExpired")}</p>
    );
  }

  return (
    <form action={formAction} className="space-y-4 rounded-lg border border-border bg-muted/15 p-4">
      <input type="hidden" name="signalId" value={signalId} />
      <p className="text-xs text-muted-foreground">
        {t("editWindowHint", {
          until: deadline.toLocaleString(locale),
        })}
      </p>
      {state?.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      {state?.ok ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">{t("editSaved")}</p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="edit-sl">{t("slField")}</Label>
          <Input
            id="edit-sl"
            name="stopLoss"
            type="number"
            step="any"
            className="mt-1 font-mono"
            defaultValue={stopLoss ?? ""}
            placeholder="—"
          />
        </div>
        <div>
          <Label htmlFor="edit-tp1">{t("tp1Field")}</Label>
          <Input
            id="edit-tp1"
            name="takeProfit"
            type="number"
            step="any"
            className="mt-1 font-mono"
            defaultValue={takeProfit ?? ""}
            placeholder="—"
          />
        </div>
        <div>
          <Label htmlFor="edit-tp2">{t("tp2Field")}</Label>
          <Input
            id="edit-tp2"
            name="takeProfit2"
            type="number"
            step="any"
            className="mt-1 font-mono"
            defaultValue={takeProfit2 ?? ""}
            placeholder="—"
          />
        </div>
        <div>
          <Label htmlFor="edit-tp3">{t("tp3Field")}</Label>
          <Input
            id="edit-tp3"
            name="takeProfit3"
            type="number"
            step="any"
            className="mt-1 font-mono"
            defaultValue={takeProfit3 ?? ""}
            placeholder="—"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="edit-notes">{t("notes")}</Label>
        <textarea
          id="edit-notes"
          name="notes"
          rows={3}
          className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring mt-1 flex w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          defaultValue={notes ?? ""}
        />
      </div>
      <Button type="submit" size="sm">
        {t("editSave")}
      </Button>
    </form>
  );
}
