"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, Loader2 } from "lucide-react";
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
import { subscribeCopyTrade } from "@/actions/copy-trade";

type Props = {
  providerId: string;
  providerName: string;
  isSubscribed: boolean;
  existingToken?: string | null;
};

export function CopyTradeButton({
  providerId,
  providerName,
  isSubscribed,
  existingToken,
}: Props) {
  const t = useTranslations("copyTrade");
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"LOT" | "PERCENT">("LOT");
  const [fixedLot, setFixedLot] = useState("0.01");
  const [riskPercent, setRiskPercent] = useState("1");
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState(existingToken);
  const [copied, setCopied] = useState(false);

  async function handleSubscribe() {
    setLoading(true);
    const formData = new FormData();
    formData.set("providerId", providerId);
    formData.set("mode", mode);
    if (mode === "LOT") formData.set("fixedLot", fixedLot);
    if (mode === "PERCENT") formData.set("riskPercent", riskPercent);

    const result = await subscribeCopyTrade(null, formData);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else if (result.ok && result.token) {
      setToken(result.token);
      // stay open — dialog transitions to token view
    }
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
          <Button variant={isSubscribed ? "outline" : "default"} size="sm" className="gap-1.5" />
        }
      >
        <Copy className="size-3.5" />
        {isSubscribed ? t("manage") : t("copy")}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="size-4" />
            {t("title")}
          </DialogTitle>
        </DialogHeader>

        {token ? (
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
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("configureHint", { name: providerName })}
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
              {t("subscribe")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
