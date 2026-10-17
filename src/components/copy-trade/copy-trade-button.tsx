"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronDown, ChevronUp, Copy, Loader2, Star, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { subscribeCopyTrade, unsubscribeCopyTrade } from "@/actions/copy-trade";
import { logGuardOverride } from "@/actions/guard-override";
import { LossStreakGuard } from "@/components/journal/loss-streak-guard";
import { ChecklistGuardHint } from "@/components/journal/checklist-guard-hint";

type Props = {
  providerId: string;
  providerName: string;
  isSubscribed: boolean;
  existingToken?: string | null;
  currentMode?: "LOT" | "PERCENT" | "RATIO" | null;
  currentFixedLot?: number | null;
  currentRiskPercent?: number | null;
  currentLotPercent?: number | null;
  currentXauusdLot?: number | null;
  currentBtcusdLot?: number | null;
  /** Win rate % (1 chữ số thập phân) từ signal đã đóng; null = chưa đủ dữ liệu */
  providerWinRate?: number | null;
  /** Tổng số signal đã đóng (win + loss) */
  providerClosedSignals?: number | null;
  /** Số người đang copy trade (isActive) provider này */
  providerCopierCount?: number | null;
  /** Số ngày kể từ lượt copy lệnh thực tế gần nhất (fallback: lượt đăng ký mới nhất); null = chưa có ai copy */
  providerLastCopyDaysAgo?: number | null;
  /** Điểm đánh giá trung bình (1-5) từ CopyTradeReview; null = chưa có đánh giá */
  providerAvgRating?: number | null;
  /** Tổng số đánh giá */
  providerReviewCount?: number | null;
};

export function CopyTradeButton({
  providerId,
  providerName,
  isSubscribed,
  existingToken,
  currentMode,
  currentFixedLot,
  currentRiskPercent,
  currentLotPercent,
  currentXauusdLot,
  currentBtcusdLot,
  providerWinRate,
  providerClosedSignals,
  providerCopierCount,
  providerLastCopyDaysAgo,
  providerAvgRating,
  providerReviewCount,
}: Props) {
  const t = useTranslations("copyTrade");
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"LOT" | "PERCENT" | "RATIO">(currentMode ?? "LOT");
  const [fixedLot, setFixedLot] = useState(
    currentFixedLot ? String(currentFixedLot) : "0.01",
  );
  const [riskPercent, setRiskPercent] = useState(
    currentRiskPercent ? String(currentRiskPercent) : "1",
  );
  const [lotPercent, setLotPercent] = useState(
    currentLotPercent ? String(currentLotPercent) : "50",
  );
  const [xauusdLot, setXauusdLot] = useState(currentXauusdLot ? String(currentXauusdLot) : "");
  const [btcusdLot, setBtcusdLot] = useState(currentBtcusdLot ? String(currentBtcusdLot) : "");
  const [loading, setLoading] = useState(false);
  const [unsubscribing, setUnsubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(isSubscribed);
  const [token, setToken] = useState(existingToken);
  const [copied, setCopied] = useState(false);
  const [showToken, setShowToken] = useState(!isSubscribed);

  async function handleSubscribe() {
    setLoading(true);
    const wasSubscribed = subscribed;
    const formData = new FormData();
    formData.set("providerId", providerId);
    formData.set("mode", mode);
    if (mode === "LOT") {
      formData.set("fixedLot", fixedLot);
      formData.set("xauusdLot", xauusdLot);
      formData.set("btcusdLot", btcusdLot);
    }
    if (mode === "PERCENT") formData.set("riskPercent", riskPercent);
    if (mode === "RATIO") formData.set("lotPercent", lotPercent);

    const result = await subscribeCopyTrade(null, formData);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else if (result.ok && result.token) {
      setToken(result.token);
      setSubscribed(true);
      if (wasSubscribed) {
        toast.success(t("settingsSaved"));
      } else {
        setShowToken(true);
      }
    }
  }

  async function handleUnsubscribe() {
    if (!confirm(t("unsubscribeConfirm"))) return;
    setUnsubscribing(true);
    const result = await unsubscribeCopyTrade(providerId);
    setUnsubscribing(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    setSubscribed(false);
    setToken(undefined);
    setShowToken(false);
    setOpen(false);
    toast.success(t("unsubscribed"));
  }

  function handleCopyToken(value: string) {
    void navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {subscribed ? (
        <DialogTrigger render={<Button variant="outline" size="sm" className="gap-1.5" />}>
          <Copy className="size-3.5" />
          {t("manage")}
        </DialogTrigger>
      ) : (
        <LossStreakGuard
          compact
          onOverride={() => void logGuardOverride("lossStreak", "copyTrade")}
        >
          <DialogTrigger render={<Button variant="default" size="sm" className="gap-1.5" />}>
            <Copy className="size-3.5" />
            {t("copy")}
          </DialogTrigger>
        </LossStreakGuard>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="size-4" />
            {t("title")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {subscribed
              ? t("manageHint", { name: providerName })
              : t("configureHint", { name: providerName })}
          </p>

          {!subscribed && <ChecklistGuardHint />}

          {!!providerReviewCount && providerAvgRating != null && (
            <div className="flex items-center gap-1.5 rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs">
              <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />
              <span className="font-medium text-foreground">{providerAvgRating.toFixed(1)}</span>
              <span className="text-muted-foreground">{t("reviewCount", { count: providerReviewCount })}</span>
            </div>
          )}

          {!!providerCopierCount && (
            <div className="flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-xs">
              <Users className="size-3.5 shrink-0 text-primary" />
              <span className="font-medium text-foreground">
                {t("statCopiers", { count: providerCopierCount })}
              </span>
              {providerLastCopyDaysAgo != null && (
                <span className="text-muted-foreground">
                  ·{" "}
                  {providerLastCopyDaysAgo <= 0
                    ? t("lastCopyToday")
                    : t("lastCopyDaysAgo", { days: providerLastCopyDaysAgo })}
                </span>
              )}
            </div>
          )}

          {providerClosedSignals !== undefined && (
            <div className="flex items-center gap-4 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
              {providerClosedSignals && providerWinRate != null ? (
                <>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("statWinRate")}</p>
                    <p
                      className={`font-mono text-sm font-semibold ${
                        providerWinRate >= 50 ? "text-emerald-500" : "text-red-500"
                      }`}
                    >
                      {providerWinRate.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("statClosedSignals")}</p>
                    <p className="font-mono text-sm font-semibold text-foreground">
                      {providerClosedSignals}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">{t("statNoData")}</p>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant={mode === "LOT" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("LOT")}
              className="flex-1"
            >
              {t("modeLot")}
            </Button>
            <Button
              variant={mode === "PERCENT" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("PERCENT")}
              className="flex-1"
            >
              {t("modePercent")}
            </Button>
            <Button
              variant={mode === "RATIO" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("RATIO")}
              className="flex-1"
            >
              {t("modeRatio")}
            </Button>
          </div>

          {mode === "LOT" ? (
            <div className="space-y-3">
              <div>
                <Label>{t("lotSize")}</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={fixedLot}
                  onChange={(e) => setFixedLot(e.target.value)}
                  className="mt-1.5 font-mono"
                />
              </div>

              <p className="text-xs text-muted-foreground">{t("symbolOverrideHint")}</p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">{t("xauusdLot")}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder={t("useDefault")}
                    value={xauusdLot}
                    onChange={(e) => setXauusdLot(e.target.value)}
                    className="mt-1.5 font-mono"
                  />
                </div>
                <div>
                  <Label className="text-xs">{t("btcusdLot")}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder={t("useDefault")}
                    value={btcusdLot}
                    onChange={(e) => setBtcusdLot(e.target.value)}
                    className="mt-1.5 font-mono"
                  />
                </div>
              </div>
            </div>
          ) : mode === "PERCENT" ? (
            <div>
              <Label>{t("riskPercent")}</Label>
              <Input
                type="number"
                step="0.1"
                min="0.1"
                max="10"
                value={riskPercent}
                onChange={(e) => setRiskPercent(e.target.value)}
                className="mt-1.5 font-mono"
              />
              <p className="mt-1 text-xs text-muted-foreground">{t("percentHint")}</p>
            </div>
          ) : (
            <div>
              <Label>{t("lotPercentLabel")}</Label>
              <Input
                type="number"
                step="1"
                min="1"
                max="500"
                value={lotPercent}
                onChange={(e) => setLotPercent(e.target.value)}
                className="mt-1.5 font-mono"
              />
              <p className="mt-1 text-xs text-muted-foreground">{t("lotPercentHint")}</p>
            </div>
          )}

          <Button onClick={() => void handleSubscribe()} disabled={loading} className="w-full">
            {loading ? <Loader2 className="mr-1 size-4 animate-spin" /> : <Copy className="mr-1 size-4" />}
            {subscribed ? t("saveChanges") : t("subscribe")}
          </Button>

          {subscribed && (
            <button
              type="button"
              onClick={() => setShowToken((v) => !v)}
              className="flex w-full items-center justify-between text-sm text-muted-foreground hover:text-foreground"
            >
              {t("showToken")}
              {showToken ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </button>
          )}

          {showToken && token && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{t("setupInstructions")}</p>
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <Label className="text-xs">{t("yourToken")}</Label>
                <div className="mt-1 flex items-center gap-2">
                  <code className="min-w-0 flex-1 break-all font-mono text-sm text-foreground">
                    {token}
                  </code>
                  <button
                    type="button"
                    onClick={() => handleCopyToken(token)}
                    className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Copy token"
                  >
                    {copied ? (
                      <Check className="size-4 text-green-500" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </button>
                </div>
              </div>
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li>1. {t("step1")}</li>
                <li>2. {t("step2")}</li>
                <li>3. {t("step3")}</li>
                <li>4. {t("step4")}</li>
              </ol>
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-muted-foreground">
                {t("warning")}
              </div>
            </div>
          )}

          {subscribed && (
            <Button
              onClick={() => void handleUnsubscribe()}
              disabled={unsubscribing}
              variant="ghost"
              className="w-full text-destructive hover:text-red-400"
            >
              {unsubscribing && <Loader2 className="mr-1 size-4 animate-spin" />}
              {t("unsubscribe")}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
