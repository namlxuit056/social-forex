"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Ban, Loader2, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { setCopierBlocked } from "@/actions/copy-trade";

export function CopierBlockButton({
  copyTradeId,
  initialBlocked,
}: {
  copyTradeId: string;
  initialBlocked: boolean;
}) {
  const t = useTranslations("copyTrade");
  const [blocked, setBlocked] = useState(initialBlocked);
  const [pending, startTransition] = useTransition();

  function handleToggle() {
    const next = !blocked;
    if (next && !confirm(t("blockCopierConfirm"))) return;

    startTransition(async () => {
      const result = await setCopierBlocked(copyTradeId, next);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setBlocked(next);
      toast.success(next ? t("copierBlocked") : t("copierUnblocked"));
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={
        blocked
          ? "gap-1.5 text-emerald-500 hover:text-emerald-400"
          : "gap-1.5 text-destructive hover:text-red-400"
      }
      onClick={handleToggle}
      disabled={pending}
    >
      {pending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : blocked ? (
        <Unlock className="size-3.5" />
      ) : (
        <Ban className="size-3.5" />
      )}
      {blocked ? t("unblockCopier") : t("blockCopier")}
    </Button>
  );
}
