"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Bot, Loader2 } from "lucide-react";
import { startTradingAgentsRun } from "@/actions/trading-agents";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { FieldSelect } from "@/components/ui/field-select";
import { ToggleChip } from "@/components/ui/toggle-chip";

const ANALYSTS = ["market", "news", "social"] as const;
type Analyst = (typeof ANALYSTS)[number];

export function TradingAgentsRunForm({ symbols }: { symbols: string[] }) {
  const t = useTranslations("tradingAgents");
  const locale = useLocale();
  const router = useRouter();
  const [symbol, setSymbol] = useState(symbols.includes("XAUUSD") ? "XAUUSD" : symbols[0]);
  const [analysts, setAnalysts] = useState<Analyst[]>(["market", "news"]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(a: Analyst) {
    setAnalysts((cur) => (cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a]));
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await startTradingAgentsRun({ symbol, language: locale, analysts });
      if (res.runId) router.push(`/trading-agents?run=${res.runId}`);
      else setError(res.error ?? "unknown");
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[200px_1fr] sm:items-end">
        <FieldSelect
          id="ta-symbol"
          label={t("symbol")}
          value={symbol}
          options={symbols.map((s) => ({ value: s, label: s }))}
          onValueChange={setSymbol}
        />
        <div className="space-y-1">
          <p className="text-xs font-medium">{t("analysts")}</p>
          <div className="flex flex-wrap gap-2">
            {ANALYSTS.map((a) => (
              <ToggleChip key={a} pressed={analysts.includes(a)} onClick={() => toggle(a)}>
                {t(`analyst.${a}`)}
              </ToggleChip>
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={submit} disabled={pending || analysts.length === 0}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Bot className="size-4" />}
          {t("run")}
        </Button>
        <span className="text-xs text-muted-foreground">{t("runHint")}</span>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {t(`errors.${error}`)}
        </p>
      ) : null}
    </div>
  );
}
