"use client";

import { useActionState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QUOTE_DEFINITIONS } from "@/lib/quotes/definitions";
import { createPriceAlert } from "@/actions/price-alerts";
import { useTranslations } from "next-intl";

type Props = {
  activeCount: number;
  limit: number;
};

export function PriceAlertForm({ activeCount, limit }: Props) {
  const t = useTranslations("alerts");
  const [state, action, pending] = useActionState(createPriceAlert, null);
  const formRef = useRef<HTMLFormElement>(null);

  const isFull = activeCount >= limit;

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  const errorMap: Record<string, string> = {
    invalid_data: t("errorInvalidData"),
    limit_reached: t("errorLimitReached", { limit }),
  };

  return (
    <form ref={formRef} action={action} className="flex flex-wrap items-end gap-3">
      <div className="flex-1 min-w-[120px] space-y-1">
        <Label htmlFor="alert-symbol">{t("symbol")}</Label>
        <Select name="symbol" defaultValue="XAUUSD">
          <SelectTrigger id="alert-symbol">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {QUOTE_DEFINITIONS.map((d) => (
              <SelectItem key={d.symbol} value={d.symbol}>
                {d.symbol}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 min-w-[120px] space-y-1">
        <Label htmlFor="alert-direction">{t("direction")}</Label>
        <Select name="direction" defaultValue="ABOVE">
          <SelectTrigger id="alert-direction">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ABOVE">{t("above")}</SelectItem>
            <SelectItem value="BELOW">{t("below")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 min-w-[130px] space-y-1">
        <Label htmlFor="alert-price">{t("targetPrice")}</Label>
        <Input
          id="alert-price"
          name="targetPrice"
          type="number"
          step="any"
          placeholder="3000"
          required
        />
      </div>

      <Button type="submit" disabled={pending || isFull} className="shrink-0">
        {pending ? t("adding") : t("addAlert")}
      </Button>

      {state?.error && (
        <p className="w-full text-sm text-destructive">
          {errorMap[state.error] ?? state.error}
        </p>
      )}
      {isFull && (
        <p className="w-full text-sm text-muted-foreground">{t("limitReached", { limit })}</p>
      )}
    </form>
  );
}
