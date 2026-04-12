"use client";

import { useTransition } from "react";
import { revokeVip } from "@/actions/admin-vip";
import { Button } from "@/components/ui/button";

export function RevokeVipButton({ userId }: { userId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(fd) => {
        if (!confirm("Thu hồi VIP của người dùng này?")) return;
        startTransition(() => revokeVip(fd));
      }}
    >
      <input type="hidden" name="userId" value={userId} />
      <Button
        type="submit"
        size="sm"
        variant="ghost"
        disabled={pending}
        className="h-7 text-xs text-destructive hover:text-red-400"
      >
        Thu hồi
      </Button>
    </form>
  );
}
