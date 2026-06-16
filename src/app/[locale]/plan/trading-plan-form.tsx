"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { CalendarClock, CheckCircle2, Save } from "lucide-react";
import { saveDailyTradingPlan } from "@/actions/trading-plan";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

export type TradingPlanFormValue = {
  planDate: string;
  watchedSymbols: string[];
  bias: "BULLISH" | "BEARISH" | "RANGE" | "WAIT";
  keyLevels: string | null;
  newsToAvoid: string | null;
  maxRiskPercent: number | null;
  maxTrades: number | null;
  sessionFocus: string | null;
  notes: string | null;
  checkedNews: boolean;
  checkedLevels: boolean;
  checkedRisk: boolean;
  checkedEmotion: boolean;
  checkedJournal: boolean;
  completedAt: string | null;
};

type Props = {
  plan: TradingPlanFormValue;
};

const checklistKeys = [
  "checkedNews",
  "checkedLevels",
  "checkedRisk",
  "checkedEmotion",
  "checkedJournal",
] as const;

export function TradingPlanForm({ plan }: Props) {
  const t = useTranslations("tradingPlan");
  const tc = useTranslations("common");
  const [state, formAction, isPending] = useActionState(saveDailyTradingPlan, null);
  const completedCount = checklistKeys.filter((key) => plan[key]).length;

  return (
    <form action={formAction} className="space-y-5">
      <Card className="border-border/70 bg-card/65">
        <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="size-4 text-primary" aria-hidden />
              {t("planCardTitle")}
            </CardTitle>
            <CardDescription className="mt-1">
              {t("planCardDesc")}
            </CardDescription>
          </div>
          {plan.completedAt ? (
            <Badge className="w-fit bg-primary/20 text-primary hover:bg-primary/25">
              <CheckCircle2 className="mr-1 size-3.5" aria-hidden />
              {t("completed")}
            </Badge>
          ) : (
            <Badge variant="outline" className="w-fit border-border text-muted-foreground">
              {t("progress", { count: completedCount, total: checklistKeys.length })}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-3">
          <div>
            <Label htmlFor="planDate">{t("planDate")}</Label>
            <Input
              id="planDate"
              name="planDate"
              type="date"
              required
              defaultValue={plan.planDate}
              className="mt-1.5"
            />
          </div>
          <div className="lg:col-span-2">
            <Label htmlFor="watchedSymbols">{t("watchedSymbols")}</Label>
            <Input
              id="watchedSymbols"
              name="watchedSymbols"
              defaultValue={plan.watchedSymbols.join(", ")}
              placeholder="XAUUSD, EURUSD, GBPUSD"
              className="mt-1.5 font-mono uppercase"
            />
          </div>
          <div>
            <Label htmlFor="bias">{t("bias")}</Label>
            <select id="bias" name="bias" defaultValue={plan.bias} className={`mt-1.5 ${SELECT_CLASS}`}>
              <option value="WAIT">{t("biasWait")}</option>
              <option value="BULLISH">{t("biasBullish")}</option>
              <option value="BEARISH">{t("biasBearish")}</option>
              <option value="RANGE">{t("biasRange")}</option>
            </select>
          </div>
          <div>
            <Label htmlFor="maxRiskPercent">{t("maxRiskPercent")}</Label>
            <Input
              id="maxRiskPercent"
              name="maxRiskPercent"
              type="number"
              min="0"
              max="100"
              step="0.1"
              defaultValue={plan.maxRiskPercent ?? ""}
              placeholder="1"
              className="mt-1.5 font-mono"
            />
          </div>
          <div>
            <Label htmlFor="maxTrades">{t("maxTrades")}</Label>
            <Input
              id="maxTrades"
              name="maxTrades"
              type="number"
              min="1"
              max="99"
              step="1"
              defaultValue={plan.maxTrades ?? ""}
              placeholder="2"
              className="mt-1.5 font-mono"
            />
          </div>
          <div className="lg:col-span-3">
            <Label htmlFor="sessionFocus">{t("sessionFocus")}</Label>
            <Input
              id="sessionFocus"
              name="sessionFocus"
              defaultValue={plan.sessionFocus ?? ""}
              placeholder={t("sessionFocusPlaceholder")}
              className="mt-1.5"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.42fr)]">
        <Card className="border-border/70 bg-card/55">
          <CardHeader>
            <CardTitle className="text-base">{t("contextTitle")}</CardTitle>
            <CardDescription>{t("contextDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div>
              <Label htmlFor="keyLevels">{t("keyLevels")}</Label>
              <Textarea
                id="keyLevels"
                name="keyLevels"
                rows={5}
                defaultValue={plan.keyLevels ?? ""}
                placeholder={t("keyLevelsPlaceholder")}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="newsToAvoid">{t("newsToAvoid")}</Label>
              <Textarea
                id="newsToAvoid"
                name="newsToAvoid"
                rows={4}
                defaultValue={plan.newsToAvoid ?? ""}
                placeholder={t("newsPlaceholder")}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="notes">{t("notes")}</Label>
              <Textarea
                id="notes"
                name="notes"
                rows={4}
                defaultValue={plan.notes ?? ""}
                placeholder={t("notesPlaceholder")}
                className="mt-1.5"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-muted/15">
          <CardHeader>
            <CardTitle className="text-base">{t("checklistTitle")}</CardTitle>
            <CardDescription>{t("checklistDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {checklistKeys.map((key) => (
              <label
                key={key}
                className={cn(
                  "flex gap-3 rounded-md border border-border/70 bg-background/55 px-3 py-3 text-sm transition hover:border-primary/30",
                  plan[key] && "border-primary/25 bg-primary/8",
                )}
              >
                <input
                  type="checkbox"
                  name={key}
                  defaultChecked={plan[key]}
                  className="mt-0.5 size-4 rounded border-border accent-primary"
                />
                <span>
                  <span className="block font-medium text-foreground">
                    {t(`${key}Title`)}
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                    {t(`${key}Desc`)}
                  </span>
                </span>
              </label>
            ))}
          </CardContent>
        </Card>
      </div>

      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state?.ok ? <p className="text-sm text-primary">{t("saved")}</p> : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          <Save className="mr-2 size-4" aria-hidden />
          {isPending ? tc("loading") : tc("save")}
        </Button>
      </div>
    </form>
  );
}
