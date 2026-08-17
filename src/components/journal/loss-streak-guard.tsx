"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

type Status = {
  active: boolean;
  remainingMinutes: number;
  lossCount: number;
};

/**
 * Khoá tạm một hành động rủi ro (thêm lệnh journal, copy trade mới) sau chuỗi thua
 * liên tiếp — không hard-block, luôn có nút "Tôi đã bình tĩnh, tiếp tục" để bỏ qua.
 * `compact`: hiện 1 nút nhỏ thay vì banner đầy đủ, dùng khi children nằm trong hàng/table hẹp.
 */
export function LossStreakGuard({
  children,
  compact = false,
}: {
  children: ReactNode;
  compact?: boolean;
}) {
  const t = useTranslations("journal");
  const [status, setStatus] = useState<Status | null>(null);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/journal/loss-streak-status", { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Status | null) => setStatus(data))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  if (!status?.active || unlocked) return <>{children}</>;

  const title = t("lossStreakCooldownTitle", {
    count: status.lossCount,
    minutes: status.remainingMinutes,
  });

  if (compact) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        title={title}
        className="gap-1.5 border-red-500/40 text-red-600 dark:text-red-300"
        onClick={() => setUnlocked(true)}
      >
        <Lock className="size-3.5" />
        {t("lossStreakCooldownCompact")}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/20 dark:text-red-200">
      <Lock className="size-4 shrink-0" />
      <span className="flex-1">{title}</span>
      <Button type="button" variant="outline" size="sm" onClick={() => setUnlocked(true)}>
        {t("lossStreakCooldownButton")}
      </Button>
    </div>
  );
}
