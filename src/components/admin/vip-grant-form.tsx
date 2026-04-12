"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { grantVip } from "@/actions/admin-vip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: { error?: string; ok?: boolean } | null = null;

export function VipGrantForm() {
  const t = useTranslations("admin");
  const [state, formAction] = useActionState(grantVip, initial);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-[1fr_auto_auto]">
      <div>
        <Label htmlFor="vip-email">{t("userEmail")}</Label>
        <Input
          id="vip-email"
          name="email"
          type="email"
          required
          placeholder="user@example.com"
          className="mt-1.5"
        />
      </div>
      <div>
        <Label htmlFor="vip-days">{t("days")}</Label>
        <Input
          id="vip-days"
          name="days"
          type="number"
          min={1}
          max={3650}
          defaultValue={30}
          required
          className="mt-1.5 w-24"
        />
      </div>
      <div className="flex items-end">
        <Button type="submit">{t("grant")}</Button>
      </div>
      {state?.error && (
        <p className="text-sm text-destructive sm:col-span-3">{state.error}</p>
      )}
      {state?.ok && (
        <p className="text-sm text-emerald-400 sm:col-span-3">
          {t("granted")}
        </p>
      )}
    </form>
  );
}
