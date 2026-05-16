"use client";

import { Pin, PinOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { togglePinSignal } from "@/actions/signal-social";
import { MAX_PINS } from "@/lib/signals/pin-signal-limit";
import { cn } from "@/lib/utils";

type Props = {
  signalId: string;
  signalSymbol: string;
  isPinned: boolean;
  loggedIn: boolean;
  atLimit: boolean;
};

export function PinSignalButton({ signalId, signalSymbol, isPinned, loggedIn, atLimit }: Props) {
  const t = useTranslations("profile");

  if (!loggedIn) return null;

  const disabled = !isPinned && atLimit;
  const label = isPinned
    ? t("unpinSignalAria", { symbol: signalSymbol })
    : t("pinSignalAria", { symbol: signalSymbol });

  return (
    <form action={async (fd) => { await togglePinSignal(fd); }}>
      <input type="hidden" name="signalId" value={signalId} />
      <Button
        type="submit"
        variant="outline"
        size="sm"
        disabled={disabled}
        aria-label={label}
        title={disabled ? t("pinLimitReachedHint", { max: MAX_PINS }) : label}
        className={cn(isPinned && "border-amber-400 text-amber-600 hover:text-amber-700")}
      >
        {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
        <span className="ml-1.5 hidden sm:inline">
          {isPinned ? t("unpinSignal") : t("pinSignal")}
        </span>
      </Button>
    </form>
  );
}
