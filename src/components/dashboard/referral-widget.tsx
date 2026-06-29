"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Copy, Gift, Share2, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type ReferralStats = {
  referralCode: string | null;
  totalReferred: number;
  totalVipDays: number;
};

export function ReferralWidget() {
  const t = useTranslations("referral");
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/referral/stats")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setStats(data);
      })
      .catch(() => {});
  }, []);

  if (!stats?.referralCode) return null;

  const referralLink = `${typeof window !== "undefined" ? window.location.origin : ""}/auth/register?ref=${stats.referralCode}`;

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
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-card to-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Gift className="size-4 text-primary" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{t("rewardHint")}</p>

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

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted/30 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="size-3.5" />
              {t("statsInvited")}
            </div>
            <p className="mt-1 text-lg font-bold text-foreground">{stats.totalReferred}</p>
          </div>
          <div className="rounded-lg bg-muted/30 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Gift className="size-3.5" />
              {t("statsVipEarned")}
            </div>
            <p className="mt-1 text-lg font-bold text-primary">{stats.totalVipDays}d</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => {
              const text = encodeURIComponent(`${t("shareText")} ${referralLink}`);
              window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}&quote=${text}`, "_blank");
            }}
          >
            <Share2 className="mr-1 size-3.5" />
            Facebook
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => {
              const text = encodeURIComponent(`${t("shareText")} ${referralLink}`);
              window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
            }}
          >
            <Share2 className="mr-1 size-3.5" />
            Twitter
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
