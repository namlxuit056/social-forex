"use client";

import { useActionState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { changePassword } from "@/actions/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: { error?: string; ok?: boolean } | null = null;

export function ChangePasswordForm() {
  const t = useTranslations("profile");
  const [state, formAction, pending] = useActionState(changePassword, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="mt-4 space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="currentPassword" className="text-sm font-medium">
          {t("currentPassword")}
        </Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="newPassword" className="text-sm font-medium">
          {t("newPassword")}
        </Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword" className="text-sm font-medium">
          {t("confirmPassword")}
        </Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      {state?.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      {state?.ok ? (
        <p className="text-sm text-primary">{t("changePasswordSuccess")}</p>
      ) : null}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? t("changePasswordSaving") : t("changePasswordSave")}
      </Button>
    </form>
  );
}
