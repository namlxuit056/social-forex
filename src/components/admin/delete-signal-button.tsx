"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { adminDeleteSignal } from "@/actions/admin-signals";
import { Button } from "@/components/ui/button";

export function DeleteSignalButton({ signalId }: { signalId: string }) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(fd) => {
        if (!confirm(t("deleteSignalConfirm"))) return;
        startTransition(async () => {
          const r = await adminDeleteSignal(null, fd);
          if (r?.error) {
            alert(r.error);
            return;
          }
          router.refresh();
        });
      }}
    >
      <input type="hidden" name="signalId" value={signalId} />
      <Button
        type="submit"
        size="sm"
        variant="ghost"
        disabled={pending}
        className="h-7 text-xs text-destructive hover:text-red-400"
      >
        {t("deleteSignal")}
      </Button>
    </form>
  );
}
