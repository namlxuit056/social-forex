"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { reviewExnessBonusClaim, type ExnessBonusState } from "@/actions/exness-bonus";

export function ExnessBonusClaimReview({
  claimId,
  status,
  adminNote,
}: {
  claimId: string;
  status: string;
  adminNote: string | null;
}) {
  const t = useTranslations("exnessBonus");
  const [state, action, pending] = useActionState<ExnessBonusState, FormData>(
    reviewExnessBonusClaim,
    null,
  );

  const btn =
    "h-8 rounded-md border border-border px-3 text-xs font-medium hover:bg-muted disabled:opacity-50";

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="claimId" value={claimId} />
      <input
        name="adminNote"
        defaultValue={adminNote ?? ""}
        maxLength={500}
        placeholder={t("admin.notePlaceholder")}
        className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs outline-none focus:ring-1 focus:ring-ring"
      />
      <div className="flex flex-wrap items-center gap-2">
        {status !== "APPROVED" && status !== "PAID" && (
          <button type="submit" name="status" value="APPROVED" disabled={pending} className={btn}>
            {t("admin.approve")}
          </button>
        )}
        {status !== "PAID" && (
          <button type="submit" name="status" value="PAID" disabled={pending} className={btn}>
            {t("admin.markPaid")}
          </button>
        )}
        {status !== "REJECTED" && (
          <button type="submit" name="status" value="REJECTED" disabled={pending} className={btn}>
            {t("admin.reject")}
          </button>
        )}
        {pending && <span className="text-xs text-muted-foreground">{t("admin.saving")}</span>}
        {state && "ok" in state && <span className="text-xs text-success">{t("admin.saved")}</span>}
        {state && "error" in state && (
          <span className="text-xs text-danger">{t(`errors.${state.error}`)}</span>
        )}
      </div>
    </form>
  );
}
