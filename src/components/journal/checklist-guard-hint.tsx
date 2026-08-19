"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ClipboardCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";

type Status = {
  complete: boolean;
  checkedCount: number;
  total: number;
};

/**
 * Nhắc nhở mềm khi checklist DailyTradingPlan (/plan) hôm nay chưa hoàn thành —
 * chỉ thông tin, không chặn submit, giống pattern News guard.
 */
export function ChecklistGuardHint() {
  const t = useTranslations("journal");
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/journal/checklist-status", { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Status | null) => setStatus(data))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  if (!status || status.complete) return null;

  return (
    <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/20 dark:text-amber-200">
      <ClipboardCheck className="mt-0.5 size-4 shrink-0" />
      <p>
        {t("checklistGuardHint", { count: status.checkedCount, total: status.total })}{" "}
        <Link href="/plan" className="font-medium underline underline-offset-2">
          {t("checklistGuardLink")}
        </Link>
      </p>
    </div>
  );
}
