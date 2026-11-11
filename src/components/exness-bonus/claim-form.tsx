"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";
import { submitExnessBonusClaim, type ExnessBonusState } from "@/actions/exness-bonus";
import { EXNESS_BONUS_PAYOUT_METHODS } from "@/lib/exness-bonus";

interface ConnectionOption {
  id: string;
  label: string;
}

const fieldClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring";

export function ExnessBonusClaimForm({ connections }: { connections: ConnectionOption[] }) {
  const t = useTranslations("exnessBonus");
  const [state, action, pending] = useActionState<ExnessBonusState, FormData>(
    submitExnessBonusClaim,
    null,
  );

  if (state && "ok" in state) {
    return (
      <p className="flex items-center gap-2 text-sm text-success">
        <CheckCircle2 className="size-4" aria-hidden />
        {t("submitted")}
      </p>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <label className="block space-y-1 text-sm">
        <span className="font-medium">{t("form.account")}</span>
        <select name="connectionId" required className={fieldClass} defaultValue={connections[0]?.id}>
          {connections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">{t("form.payoutMethod")}</span>
        <select name="payoutMethod" required className={fieldClass} defaultValue="usdt-trc20">
          {EXNESS_BONUS_PAYOUT_METHODS.map((m) => (
            <option key={m} value={m}>
              {t(`payoutMethods.${m}`)}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">{t("form.payoutDetails")}</span>
        <input
          name="payoutDetails"
          required
          minLength={4}
          maxLength={300}
          placeholder={t("form.payoutDetailsPlaceholder")}
          className={fieldClass}
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">{t("form.note")}</span>
        <textarea
          name="userNote"
          maxLength={500}
          rows={2}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
        />
      </label>
      {state && "error" in state && (
        <p className="text-sm text-danger">{t(`errors.${state.error}`)}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {pending ? t("form.submitting") : t("form.submit")}
      </button>
    </form>
  );
}
