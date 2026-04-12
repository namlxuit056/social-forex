"use client";

import { useActionState } from "react";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { sendDirectMessage } from "@/actions/messages";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const initial: { error?: string; ok?: boolean } | null = null;

export function DmCompose({ recipientId }: { recipientId: string }) {
  const t = useTranslations("messages");
  const tc = useTranslations("common");
  const [state, formAction] = useActionState(sendDirectMessage, initial);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      ref.current?.reset();
    }
  }, [state?.ok]);

  return (
    <form ref={ref} action={formAction} className="space-y-2">
      <input type="hidden" name="recipientId" value={recipientId} />
      <Textarea
        name="body"
        required
        rows={3}
        placeholder={t("compose")}
      />
      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <Button type="submit" size="sm">
        {tc("send")}
      </Button>
    </form>
  );
}
