"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { BookOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Props = {
  signalId: string;
  symbol: string;
  direction: string;
  entry: number;
  stopLoss: number | null;
  takeProfit: number | null;
  loggedIn: boolean;
};

export function CopyToJournalButton({
  signalId,
  symbol,
  direction,
  entry,
  stopLoss,
  takeProfit,
  loggedIn,
}: Props) {
  const t = useTranslations("journal");
  const [loading, setLoading] = useState(false);

  if (!loggedIn) return null;

  async function handleCopy() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        symbol,
        direction,
        entry: String(entry),
        ...(stopLoss != null ? { stopLoss: String(stopLoss) } : {}),
        ...(takeProfit != null ? { takeProfit: String(takeProfit) } : {}),
        from: signalId,
      });
      window.location.href = `/journal?${params.toString()}`;
    } catch {
      toast.error("Failed to copy");
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => void handleCopy()}
      disabled={loading}
      className="h-9 gap-1.5 text-[0.8rem]"
    >
      {loading ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <BookOpen className="size-3.5" aria-hidden />
      )}
      <span className="hidden sm:inline">{t("copyFromSignal")}</span>
    </Button>
  );
}
