"use client";

import { useEffect, useState, useTransition } from "react";
import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { X, BookOpen, AlertTriangle } from "lucide-react";
import { createTrade } from "@/actions/journal";
import { TRADE_SETUPS, useSetupLabels } from "./use-setup-labels";
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

type UpcomingEvent = {
  id: string;
  timeUtc: string;
  currency: string;
  title: string;
  impact: string;
};

type PrefillData = {
  symbol?: string;
  direction?: string;
  entry?: string;
  stopLoss?: string;
  takeProfit?: string;
  from?: string;
};

export function JournalFormCard({
  onClose,
  prefill,
}: {
  onClose: () => void;
  prefill?: PrefillData;
}) {
  const t = useTranslations("journal");
  const locale = useLocale();
  const setupLabels = useSetupLabels();
  const [, startTransition] = useTransition();
  const [state, formAction, isPending] = useActionState(createTrade, null);
  const [symbol, setSymbol] = useState(prefill?.symbol ?? "");
  const [newsGuard, setNewsGuard] = useState<{
    hours: number;
    events: UpcomingEvent[];
  } | null>(null);

  useEffect(() => {
    if (state?.ok) startTransition(() => onClose());
  }, [state?.ok, startTransition, onClose]);

  // News guard: check tin high-impact sắp diễn ra khi user gõ symbol (debounce 500ms)
  useEffect(() => {
    const q = symbol.trim().toUpperCase();
    const controller = new AbortController();
    const timer = setTimeout(
      () => {
        if (q.length < 6) {
          setNewsGuard(null);
          return;
        }
        fetch(`/api/calendar/upcoming?symbol=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((data: { hours: number; events: UpcomingEvent[] } | null) => {
            setNewsGuard(data && data.events.length > 0 ? data : null);
          })
          .catch(() => {});
      },
      q.length < 6 ? 0 : 500,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [symbol]);

  return (
    <Card className="border-primary/20">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          {prefill?.from ? (
            <>
              <BookOpen className="size-4 text-primary" />
              {t("copyFromSignal")}
            </>
          ) : (
            t("addTrade")
          )}
        </CardTitle>
        <Button variant="ghost" size="icon" className="size-7" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {newsGuard && (
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/20 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <div className="min-w-0 space-y-1">
              <p className="font-medium">
                {t("newsGuardTitle", {
                  symbol: symbol.trim().toUpperCase(),
                  hours: newsGuard.hours,
                })}
              </p>
              <ul className="space-y-0.5 text-xs">
                {newsGuard.events.slice(0, 3).map((e) => (
                  <li key={e.id} className="truncate">
                    <span className="font-mono">{e.currency}</span> ·{" "}
                    {new Date(e.timeUtc).toLocaleString(locale, {
                      weekday: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    · {e.title}
                  </li>
                ))}
              </ul>
              <p className="text-xs">{t("newsGuardHint")}</p>
            </div>
          </div>
        )}
        <form action={formAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {prefill?.from && (
            <input type="hidden" name="copiedFromSignalId" value={prefill.from} />
          )}
          <div>
            <Label>{t("symbol")}</Label>
            <Input
              name="symbol"
              required
              placeholder="XAUUSD"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="mt-1.5 font-mono uppercase"
            />
          </div>
          <div>
            <Label>{t("direction")}</Label>
            <select
              name="direction"
              defaultValue={prefill?.direction}
              className={`mt-1.5 ${SELECT_CLASS}`}
            >
              <option value="LONG">LONG</option>
              <option value="SHORT">SHORT</option>
            </select>
          </div>
          <div>
            <Label>{t("entry")}</Label>
            <Input
              name="entry"
              type="number"
              step="any"
              required
              defaultValue={prefill?.entry}
              className="mt-1.5 font-mono"
            />
          </div>
          <div>
            <Label>{t("stopLoss")}</Label>
            <Input
              name="stopLoss"
              type="number"
              step="any"
              defaultValue={prefill?.stopLoss}
              className="mt-1.5 font-mono"
            />
          </div>
          <div>
            <Label>{t("takeProfit")}</Label>
            <Input
              name="takeProfit"
              type="number"
              step="any"
              defaultValue={prefill?.takeProfit}
              className="mt-1.5 font-mono"
            />
          </div>
          <div>
            <Label>{t("lotSize")}</Label>
            <Input name="lotSize" type="number" step="any" placeholder="0.01" className="mt-1.5 font-mono" />
          </div>
          <div>
            <Label>{t("setup")}</Label>
            <select name="setup" defaultValue="" className={`mt-1.5 ${SELECT_CLASS}`}>
              <option value="">{t("setupNone")}</option>
              {TRADE_SETUPS.map((s) => (
                <option key={s} value={s}>
                  {setupLabels[s]}
                </option>
              ))}
            </select>
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
