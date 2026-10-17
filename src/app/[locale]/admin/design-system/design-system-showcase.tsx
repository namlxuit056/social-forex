"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { BarChart3, DollarSign, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldSelect } from "@/components/ui/field-select";
import { FilterBar } from "@/components/ui/filter-bar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollTabs } from "@/components/ui/scroll-tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import {
  DirectionBadge,
  ImpactBadge,
  SignalStatusBadge,
  TierBadge,
  ToneBadge,
} from "@/components/ui/status-badge";
import { PriceLevels } from "@/components/signals/price-levels";
import { EmptyState } from "@/components/layout/empty-state";
import type { Tone } from "@/lib/ui/status-map";
import { cn } from "@/lib/utils";

const COLOR_TOKENS = [
  "background",
  "card",
  "muted",
  "foreground",
  "muted-foreground",
  "border",
  "border-strong",
  "primary",
  "success",
  "success-bg",
  "danger",
  "danger-bg",
  "warning",
  "warning-bg",
  "info",
  "info-bg",
] as const;

const TONES: Tone[] = ["neutral", "primary", "success", "danger", "warning", "info"];

const TYPE_SCALE = [
  { cls: "text-4xl font-semibold", note: "36 / semibold · hero" },
  { cls: "text-xl font-semibold", note: "20 / semibold · page title" },
  { cls: "text-lg font-medium", note: "18 / medium · section title" },
  { cls: "text-base font-medium", note: "16 / medium · card title" },
  { cls: "text-sm", note: "14 / regular · body" },
  { cls: "text-xs text-muted-foreground", note: "12 / regular · meta" },
];

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} data-ds-section={id} className="space-y-4">
      <h2 id={id} className="border-b border-border pb-2 text-lg font-medium text-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Small caption above each example so states line up across blocks. */
function State({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <p className="text-xs text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

function Swatches() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {COLOR_TOKENS.map((name) => (
        <div key={name} className="flex items-center gap-2 rounded-lg border border-border bg-card p-2">
          <span
            className="size-8 shrink-0 rounded-md border border-border"
            style={{ background: `var(--${name})` }}
          />
          <code className="min-w-0 truncate text-xs text-foreground">--{name}</code>
        </div>
      ))}
    </div>
  );
}

export function DesignSystemShowcase() {
  const t = useTranslations("designSystem");
  const [period, setPeriod] = useState<"today" | "week" | "all">("week");
  const [checked, setChecked] = useState(true);

  return (
    <div className="space-y-12">
      <Section id="ds-colors" title={t("colors")}>
        <div className="grid gap-4 lg:grid-cols-2">
          <State label={t("lightTheme")}>
            <div className="rounded-xl bg-background p-3">
              <Swatches />
            </div>
          </State>
          <State label={t("darkTheme")}>
            <div className="dark rounded-xl bg-background p-3 text-foreground">
              <Swatches />
            </div>
          </State>
        </div>
      </Section>

      <Section id="ds-type" title={t("typography")}>
        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          {TYPE_SCALE.map((row) => (
            <div key={row.cls} className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-6">
              <code className="w-56 shrink-0 text-xs text-muted-foreground">{row.note}</code>
              <p className={cn("min-w-0 text-foreground", row.cls)}>{t("sampleSentence")}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="ds-buttons" title={t("buttons")}>
        <div className="flex flex-wrap items-end gap-4">
          <State label="default"><Button>{t("save")}</Button></State>
          <State label="outline"><Button variant="outline">{t("cancel")}</Button></State>
          <State label="secondary"><Button variant="secondary">{t("cancel")}</Button></State>
          <State label="ghost"><Button variant="ghost">{t("cancel")}</Button></State>
          <State label="destructive"><Button variant="destructive">{t("delete")}</Button></State>
          <State label={t("disabled")}><Button disabled>{t("save")}</Button></State>
        </div>
      </Section>

      <Section id="ds-badges" title={t("badges")}>
        <div className="flex flex-wrap items-end gap-4">
          {TONES.map((tone) => (
            <State key={tone} label={tone}>
              <ToneBadge tone={tone}>{tone}</ToneBadge>
            </State>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DirectionBadge direction="LONG" />
          <DirectionBadge direction="SHORT" />
          <TierBadge tier="FREE" />
          <TierBadge tier="VIP" />
          <ImpactBadge impact="high" label="High" />
          <ImpactBadge impact="medium" label="Med" />
          <ImpactBadge impact="low" label="Low" />
          {(["PENDING", "ACTIVE", "CLOSED_WIN", "CLOSED_LOSS", "CANCELLED"] as const).map((s) => (
            <SignalStatusBadge key={s} status={s} label={s} />
          ))}
        </div>
      </Section>

      <Section id="ds-inputs" title={t("inputs")}>
        <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
          <State label={t("normal")}>
            <Label htmlFor="ds-in-1" className="text-xs">{t("fieldLabel")}</Label>
            <Input id="ds-in-1" defaultValue="XAUUSD" className="mt-1 h-9" />
          </State>
          <State label={t("placeholder")}>
            <Label htmlFor="ds-in-2" className="text-xs">{t("fieldLabel")}</Label>
            <Input id="ds-in-2" placeholder={t("placeholderText")} className="mt-1 h-9" />
          </State>
          <State label={t("invalid")}>
            <Label htmlFor="ds-in-3" className="text-xs">{t("fieldLabel")}</Label>
            <Input id="ds-in-3" defaultValue="-1" aria-invalid className="mt-1 h-9" />
          </State>
          <State label={t("disabled")}>
            <Label htmlFor="ds-in-4" className="text-xs">{t("fieldLabel")}</Label>
            <Input id="ds-in-4" defaultValue="10000" disabled className="mt-1 h-9" />
          </State>
          <State label={t("select")}>
            <FieldSelect
              id="ds-select"
              label={t("fieldLabel")}
              value={period}
              onValueChange={setPeriod}
              options={[
                { value: "today", label: t("optionToday") },
                { value: "week", label: t("optionWeek") },
                { value: "all", label: t("optionAll") },
              ]}
            />
          </State>
          <State label={t("checkbox")}>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={checked} onCheckedChange={setChecked} />
              {t("checkboxLabel")}
            </label>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox disabled />
              {t("disabled")}
            </label>
          </State>
        </div>
      </Section>

      <Section id="ds-blocks" title={t("blocks")}>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label={t("statTrades")} value="128" sub="72W / 50L / 6BE" icon={BarChart3} />
          <StatCard label={t("statWinRate")} value="56%" icon={Trophy} trend="positive" />
          <StatCard label={t("statPnl")} value="-$412.50" icon={DollarSign} trend="negative" />
        </div>
        <PriceLevels
          values={{ entry: 4076.44, sl: 4061.2, tp1: 4098, tp2: null, tp3: null }}
          labels={{ entry: "Entry", sl: "SL", tp1: "TP1", tp2: "TP2", tp3: "TP3" }}
        />
        <ScrollTabs
          ariaLabel={t("tabsExample")}
          activeKey="stats"
          tabs={["trades", "weekly", "daily", "edge", "stats", "chat", "emotion", "lessons"].map((key) => ({
            key,
            href: "/admin/design-system",
            label: key,
          }))}
        />
        <FilterBar footnote={t("filterFootnote")}>
          <div className="min-w-0 flex-1 basis-44">
            <Label htmlFor="ds-filter" className="text-xs">{t("fieldLabel")}</Label>
            <Input id="ds-filter" placeholder={t("placeholderText")} className="mt-1 h-9" />
          </div>
          <Button variant="outline" className="h-9">{t("reset")}</Button>
        </FilterBar>
      </Section>

      <Section id="ds-states" title={t("states")}>
        <div className="grid gap-4 lg:grid-cols-2">
          <State label={t("loading")}>
            <div className="space-y-2 rounded-xl border border-border bg-card p-4">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </State>
          <State label={t("empty")}>
            <EmptyState title={t("emptyTitle")} description={t("emptyDesc")} />
          </State>
        </div>
      </Section>
    </div>
  );
}
