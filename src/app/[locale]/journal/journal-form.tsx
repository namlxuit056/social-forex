"use client";

import { useEffect, useTransition } from "react";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { createTrade } from "@/actions/journal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function JournalFormCard({ onClose }: { onClose: () => void }) {
  const t = useTranslations("journal");
  const [, startTransition] = useTransition();
  const [state, formAction, isPending] = useActionState(createTrade, null);

  useEffect(() => {
    if (state?.ok) startTransition(() => onClose());
  }, [state?.ok, startTransition, onClose]);

  return (
    <Card className="border-primary/20">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">{t("addTrade")}</CardTitle>
        <Button variant="ghost" size="icon" className="size-7" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Label>{t("symbol")}</Label>
            <Input name="symbol" required placeholder="XAUUSD" className="mt-1.5 font-mono uppercase" />
          </div>
          <div>
            <Label>{t("direction")}</Label>
            <select name="direction" className={`mt-1.5 ${SELECT_CLASS}`}>
              <option value="LONG">LONG</option>
              <option value="SHORT">SHORT</option>
            </select>
          </div>
          <div>
            <Label>{t("entry")}</Label>
            <Input name="entry" type="number" step="any" required className="mt-1.5 font-mono" />
          </div>
          <div>
            <Label>{t("stopLoss")}</Label>
            <Input name="stopLoss" type="number" step="any" className="mt-1.5 font-mono" />
          </div>
          <div>
            <Label>{t("takeProfit")}</Label>
            <Input name="takeProfit" type="number" step="any" className="mt-1.5 font-mono" />
          </div>
          <div>
            <Label>{t("lotSize")}</Label>
            <Input name="lotSize" type="number" step="any" placeholder="0.01" className="mt-1.5 font-mono" />
          </div>
          <div>
            <Label>{t("exitPrice")}</Label>
            <Input name="exitPrice" type="number" step="any" className="mt-1.5 font-mono" />
          </div>
          <div>
            <Label>{t("result")}</Label>
            <select name="result" className={`mt-1.5 ${SELECT_CLASS}`}>
              <option value="PENDING">{t("pending")}</option>
              <option value="WIN">{t("win")}</option>
              <option value="LOSS">{t("loss")}</option>
              <option value="BREAKEVEN">{t("breakeven")}</option>
            </select>
          </div>
          <div>
            <Label>{t("pnl")} ($)</Label>
            <Input name="pnl" type="number" step="any" className="mt-1.5 font-mono" />
          </div>
          <div>
            <Label>{t("openedAt")}</Label>
            <Input name="openedAt" type="datetime-local" className="mt-1.5" />
          </div>
          <div>
            <Label>{t("closedAt")}</Label>
            <Input name="closedAt" type="datetime-local" className="mt-1.5" />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <Label>{t("notes")}</Label>
            <Textarea name="notes" rows={2} className="mt-1.5" />
          </div>
          {state?.error && (
            <p className="text-sm text-destructive sm:col-span-2 lg:col-span-3">{state.error}</p>
          )}
          <div className="sm:col-span-2 lg:col-span-3">
            <Button type="submit" disabled={isPending}>
              {isPending ? "…" : t("addTrade")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
