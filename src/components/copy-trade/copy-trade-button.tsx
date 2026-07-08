"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronDown, ChevronUp, Copy, Loader2 } from "lucide-react";
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

type Props = {
  providerId: string;
  providerName: string;
  isSubscribed: boolean;
  existingToken?: string | null;
  currentMode?: "LOT" | "PERCENT" | null;
  currentFixedLot?: number | null;
  currentRiskPercent?: number | null;
  currentXauusdLot?: number | null;
  currentBtcusdLot?: number | null;
};

export function CopyTradeButton({
  providerId,
  providerName,
  isSubscribed,
  existingToken,
  currentMode,
  currentFixedLot,
  currentRiskPercent,
  currentXauusdLot,
  currentBtcusdLot,
}: Props) {
  const t = useTranslations("copyTrade");
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"LOT" | "PERCENT">(currentMode ?? "LOT");
  const [fixedLot, setFixedLot] = useState(
    currentFixedLot ? String(currentFixedLot) : "0.01",
  );
  const [riskPercent, setRiskPercent] = useState(
    currentRiskPercent ? String(currentRiskPercent) : "1",
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
      <DialogTrigger
        render={
          <Button variant={subscribed ? "outline" : "default"} size="sm" className="gap-1.5" />
        }
      >
        <Copy className="size-3.5" />
        {subscribed ? t("manage") : t("copy")}
      </DialogTrigger>
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
          ) : (
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
              <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
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
