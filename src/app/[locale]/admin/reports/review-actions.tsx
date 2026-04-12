"use client";

import { useTranslations } from "next-intl";
import { reviewReport } from "@/actions/moderation";
import { Button } from "@/components/ui/button";

export function ReviewReportActions({ reportId }: { reportId: string }) {
  const t = useTranslations("admin");

  return (
    <div className="flex gap-2">
      <form action={reviewReport}>
        <input type="hidden" name="reportId" value={reportId} />
        <input type="hidden" name="action" value="review" />
        <Button size="sm" variant="default" className="h-7 text-xs">
          {t("markReviewed")}
        </Button>
      </form>
      <form action={reviewReport}>
        <input type="hidden" name="reportId" value={reportId} />
        <input type="hidden" name="action" value="dismiss" />
        <Button size="sm" variant="outline" className="h-7 text-xs">
          {t("dismiss")}
        </Button>
      </form>
    </div>
  );
}
