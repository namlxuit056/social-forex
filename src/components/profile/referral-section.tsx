"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Copy, Gift, Users, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type ProfileReferralSectionProps = {
  referralCode: string;
  totalReferred: number;
  totalVipDays: number;
};

export function ProfileReferralSection({
  referralCode,
  totalReferred,
  totalVipDays,
}: ProfileReferralSectionProps) {
  const t = useTranslations("referral");
  const [copied, setCopied] = useState(false);

  const referralLink = `${typeof window !== "undefined" ? window.location.origin : ""}/auth/register?ref=${referralCode}`;

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success(t("copied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card/50 p-6 ring-1 ring-foreground/5">
      <h2 className="flex items-center gap-2 font-medium text-foreground">
        <Gift className="size-4 text-primary" />
        {t("title")}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("rewardHint")}</p>

      <div className="mt-4 space-y-4">
        {/* Referral Link */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <LinkIcon className="size-3" />
            {t("linkLabel")}
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 truncate rounded-lg border border-border/60 bg-muted/30 px-3 py-2 font-mono text-sm">
              {referralLink}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void copyToClipboard()}
              className="shrink-0"
            >
              {copied ? (
                <span className="text-green-500">{t("copied")}</span>
              ) : (
                <>
                  <Copy className="mr-1 size-3.5" />
                  {t("copyLink")}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted/30 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="size-3.5" />
              {t("statsInvited")}
            </div>
            <p className="mt-1 text-lg font-bold text-foreground">{totalReferred}</p>
          </div>
          <div className="rounded-lg bg-muted/30 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Gift className="size-3.5" />
              {t("statsVipEarned")}
            </div>
            <p className="mt-1 text-lg font-bold text-primary">{totalVipDays}d</p>
          </div>
        </div>
      </div>
    </div>
  );
}
