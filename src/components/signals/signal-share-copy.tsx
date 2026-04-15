"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SignalStatus =
  | "ACTIVE"
  | "CLOSED_WIN"
  | "CLOSED_LOSS"
  | "CANCELLED";

function fmtPrice(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return String(n);
}

function statusLine(
  status: SignalStatus,
  t: (key: string) => string,
): string {
  switch (status) {
    case "ACTIVE":
      return t("statusActive");
    case "CLOSED_WIN":
      return t("statusClosedWin");
    case "CLOSED_LOSS":
      return t("statusClosedLoss");
    case "CANCELLED":
      return t("statusCancelled");
    default:
      return status;
  }
}

function buildShareText(
  t: (key: string, values?: Record<string, string | number>) => string,
  p: {
    symbol: string;
    direction: string;
    tier: string;
    status: SignalStatus;
    entry: number | null;
    stopLoss: number | null;
    takeProfit: number | null;
    takeProfit2: number | null;
    takeProfit3: number | null;
    notes: string | null;
    signalUrl: string;
  },
): string {
  const notesRaw = p.notes?.trim();
  const notes =
    notesRaw && notesRaw.length > 900
      ? `${notesRaw.slice(0, 897)}…`
      : notesRaw;

  const lines = [
    t("shareHeadline", { symbol: p.symbol }),
    `${t("directionLabel")}: ${p.direction}`,
    `${t("tierLabel")}: ${p.tier}`,
    `${t("status")}: ${statusLine(p.status, t)}`,
    `${t("entryField")}: ${fmtPrice(p.entry)}`,
    `${t("slField")}: ${fmtPrice(p.stopLoss)}`,
    `${t("tp1Field")}: ${fmtPrice(p.takeProfit)}`,
    `${t("tp2Field")}: ${fmtPrice(p.takeProfit2)}`,
    `${t("tp3Field")}: ${fmtPrice(p.takeProfit3)}`,
  ];

  if (notes) {
    lines.push(`${t("notes")}: ${notes}`);
  }

  lines.push("", t("shareLinkLine", { url: p.signalUrl }), "", t("shareFooter"));

  return lines.join("\n");
}

export function SignalShareCopy({
  show,
  className,
  symbol,
  direction,
  tier,
  status,
  entry,
  stopLoss,
  takeProfit,
  takeProfit2,
  takeProfit3,
  notes,
  signalUrl,
}: {
  show: boolean;
  className?: string;
  symbol: string;
  direction: string;
  tier: "FREE" | "VIP";
  status: SignalStatus;
  entry: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  takeProfit2: number | null;
  takeProfit3: number | null;
  notes: string | null;
  signalUrl: string;
}) {
  const t = useTranslations("signals");
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(async () => {
    const text = buildShareText(t, {
      symbol,
      direction,
      tier,
      status,
      entry,
      stopLoss,
      takeProfit,
      takeProfit2,
      takeProfit3,
      notes,
      signalUrl,
    });
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(t("shareCopied"));
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("shareCopyFailed"));
    }
  }, [
    t,
    symbol,
    direction,
    tier,
    status,
    entry,
    stopLoss,
    takeProfit,
    takeProfit2,
    takeProfit3,
    notes,
    signalUrl,
  ]);

  if (!show) return null;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn("gap-1.5", className)}
      onClick={onCopy}
      aria-label={t("shareCopyAria")}
    >
      {copied ? (
        <Check className="size-3.5 shrink-0" aria-hidden />
      ) : (
        <Copy className="size-3.5 shrink-0" aria-hidden />
      )}
      {copied ? t("shareCopied") : t("shareCopy")}
    </Button>
  );
}
