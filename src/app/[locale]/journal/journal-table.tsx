"use client";

import { useState, useEffect } from "react";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Trash2, Pencil, X } from "lucide-react";
import { deleteTrade, updateTrade } from "@/actions/journal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface Trade {
  id: string;
  symbol: string;
  direction: string;
  entry: number;
  stopLoss: number | null;
  takeProfit: number | null;
  exitPrice: number | null;
  lotSize: number | null;
  result: string;
  pnl: number | null;
  notes: string | null;
  openedAt: string;
  closedAt: string | null;
}

type Filter = "ALL" | "WIN" | "LOSS" | "BREAKEVEN" | "PENDING";

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 16);
}

const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

function EditForm({ trade, onClose }: { trade: Trade; onClose: () => void }) {
  const t = useTranslations("journal");
  const [state, formAction, isPending] = useActionState(updateTrade, null);

  useEffect(() => {
    if (state?.ok) onClose();
  }, [state?.ok, onClose]);

  return (
    <Card className="border-primary/20">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">{t("editTrade")}</CardTitle>
        <Button variant="ghost" size="icon" className="size-7" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <input type="hidden" name="tradeId" value={trade.id} />
          <div>
            <Label>{t("symbol")}</Label>
            <Input name="symbol" required defaultValue={trade.symbol} className="mt-1.5 font-mono uppercase" />
          </div>
          <div>
            <Label>{t("direction")}</Label>
            <select name="direction" defaultValue={trade.direction} className={`mt-1.5 ${SELECT_CLASS}`}>
              <option value="LONG">LONG</option>
              <option value="SHORT">SHORT</option>
            </select>
          </div>
          <div>
            <Label>{t("entry")}</Label>
            <Input name="entry" type="number" step="any" required defaultValue={trade.entry} className="mt-1.5 font-mono" />
          </div>
          <div>
            <Label>{t("stopLoss")}</Label>
            <Input name="stopLoss" type="number" step="any" defaultValue={trade.stopLoss ?? ""} className="mt-1.5 font-mono" />
          </div>
          <div>
            <Label>{t("takeProfit")}</Label>
            <Input name="takeProfit" type="number" step="any" defaultValue={trade.takeProfit ?? ""} className="mt-1.5 font-mono" />
          </div>
          <div>
            <Label>{t("lotSize")}</Label>
            <Input name="lotSize" type="number" step="any" defaultValue={trade.lotSize ?? ""} className="mt-1.5 font-mono" />
          </div>
          <div>
            <Label>{t("exitPrice")}</Label>
            <Input name="exitPrice" type="number" step="any" defaultValue={trade.exitPrice ?? ""} className="mt-1.5 font-mono" />
          </div>
          <div>
            <Label>{t("result")}</Label>
            <select name="result" defaultValue={trade.result} className={`mt-1.5 ${SELECT_CLASS}`}>
              <option value="PENDING">{t("pending")}</option>
              <option value="WIN">{t("win")}</option>
              <option value="LOSS">{t("loss")}</option>
              <option value="BREAKEVEN">{t("breakeven")}</option>
            </select>
          </div>
          <div>
            <Label>{t("pnl")} ($)</Label>
            <Input name="pnl" type="number" step="any" defaultValue={trade.pnl ?? ""} className="mt-1.5 font-mono" />
          </div>
          <div>
            <Label>{t("openedAt")}</Label>
            <Input name="openedAt" type="datetime-local" defaultValue={toDatetimeLocal(trade.openedAt)} className="mt-1.5" />
          </div>
          <div>
            <Label>{t("closedAt")}</Label>
            <Input name="closedAt" type="datetime-local" defaultValue={toDatetimeLocal(trade.closedAt)} className="mt-1.5" />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <Label>{t("notes")}</Label>
            <Textarea name="notes" rows={2} defaultValue={trade.notes ?? ""} className="mt-1.5" />
          </div>
          {state?.error && (
            <p className="text-sm text-destructive sm:col-span-2 lg:col-span-3">{state.error}</p>
          )}
          <div className="sm:col-span-2 lg:col-span-3">
            <Button type="submit" disabled={isPending}>
              {isPending ? "…" : t("editTrade")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ResultBadge({ result, t }: { result: string; t: ReturnType<typeof useTranslations> }) {
  const classes: Record<string, string> = {
    WIN: "bg-emerald-500/15 text-emerald-500",
    LOSS: "bg-red-500/15 text-red-500",
    BREAKEVEN: "bg-yellow-500/15 text-yellow-500",
    PENDING: "bg-blue-500/15 text-blue-400",
  };
  const labels: Record<string, string> = {
    WIN: t("win"),
    LOSS: t("loss"),
    BREAKEVEN: t("breakeven"),
    PENDING: t("pending"),
  };
  return (
    <span className={cn("inline-block rounded-full px-2 py-0.5 text-[11px] font-medium", classes[result] ?? "bg-muted text-muted-foreground")}>
      {labels[result] ?? result}
    </span>
  );
}

function TradeRow({
  trade,
  locale,
  isEditing,
  onEdit,
  t,
}: {
  trade: Trade;
  locale: string;
  isEditing: boolean;
  onEdit: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const isPending = trade.result === "PENDING";

  return (
    <tr
      className={cn(
        "transition-colors hover:bg-muted/30",
        isPending && "opacity-60",
        isEditing && "bg-primary/5",
      )}
    >
      <td className="px-4 py-2.5 font-mono font-medium">{trade.symbol}</td>
      <td className="px-4 py-2.5">
        <Badge variant={trade.direction === "LONG" ? "default" : "destructive"} className="text-[11px]">
          {trade.direction}
        </Badge>
      </td>
      <td className="px-4 py-2.5 font-mono text-xs">{trade.entry}</td>
      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{trade.stopLoss ?? "—"}</td>
      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{trade.takeProfit ?? "—"}</td>
      <td className="px-4 py-2.5 font-mono text-xs">{trade.exitPrice ?? "—"}</td>
      <td className="px-4 py-2.5 font-mono text-xs">{trade.lotSize ?? "—"}</td>
      <td className="px-4 py-2.5">
        <ResultBadge result={trade.result} t={t} />
      </td>
      <td
        className={cn(
          "px-4 py-2.5 font-mono text-xs font-medium",
          trade.pnl != null && trade.pnl >= 0 ? "text-emerald-500" : "text-red-500",
        )}
      >
        {trade.pnl != null
          ? trade.pnl >= 0
            ? `+$${trade.pnl.toFixed(2)}`
            : `-$${Math.abs(trade.pnl).toFixed(2)}`
          : "—"}
      </td>
      <td className="max-w-40 px-4 py-2.5 text-xs text-muted-foreground">
        {trade.notes ? (
          <span title={trade.notes} className="block truncate">
            {trade.notes}
          </span>
        ) : (
          <span className="text-muted-foreground/40">—</span>
        )}
      </td>
      <td className="px-4 py-2.5 text-xs text-muted-foreground">
        {new Date(trade.openedAt).toLocaleString(locale, {
          month: "numeric",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </td>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn("size-7", isEditing ? "text-primary" : "text-muted-foreground hover:text-foreground")}
            onClick={onEdit}
          >
            <Pencil className="size-3.5" />
          </Button>
          <form
            action={deleteTrade}
            onSubmit={(e) => {
              if (!confirm(t("deleteConfirm"))) e.preventDefault();
            }}
          >
            <input type="hidden" name="tradeId" value={trade.id} />
            <Button type="submit" variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive">
              <Trash2 className="size-3.5" />
            </Button>
          </form>
        </div>
      </td>
    </tr>
  );
}

export function JournalTable({ trades, locale }: { trades: Trade[]; locale: string }) {
  const t = useTranslations("journal");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [editingId, setEditingId] = useState<string | null>(null);

  const counts = {
    ALL: trades.length,
    WIN: trades.filter((tr) => tr.result === "WIN").length,
    LOSS: trades.filter((tr) => tr.result === "LOSS").length,
    BREAKEVEN: trades.filter((tr) => tr.result === "BREAKEVEN").length,
    PENDING: trades.filter((tr) => tr.result === "PENDING").length,
  };

  const filtered = filter === "ALL" ? trades : trades.filter((tr) => tr.result === filter);

  const filterButtons: { key: Filter; label: string; color?: string }[] = [
    { key: "ALL", label: t("all") },
    { key: "WIN", label: t("win"), color: "text-emerald-500" },
    { key: "LOSS", label: t("loss"), color: "text-red-500" },
    ...(counts.BREAKEVEN > 0 ? [{ key: "BREAKEVEN" as Filter, label: t("breakeven"), color: "text-yellow-500" }] : []),
    ...(counts.PENDING > 0 ? [{ key: "PENDING" as Filter, label: t("pending"), color: "text-blue-400" }] : []),
  ];

  return (
    <div className="space-y-4">
      {editingId && (
        <EditForm
          trade={trades.find((tr) => tr.id === editingId)!}
          onClose={() => setEditingId(null)}
        />
      )}

      <Card className="border-border/60">
        <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">{t("history")}</CardTitle>
          <div className="flex flex-wrap gap-1">
            {filterButtons.map(({ key, label, color }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                  filter === key
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/60 bg-transparent text-muted-foreground hover:border-border hover:text-foreground",
                )}
              >
                <span className={filter === key ? undefined : color}>{label}</span>
                <span className={cn("tabular-nums", filter === key ? "text-primary-foreground/70" : "text-muted-foreground/60")}>
                  {counts[key]}
                </span>
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {filtered.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-muted-foreground">{t("emptyFilter")}</p>
          ) : (
            <table className="w-full min-w-195 text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2.5">{t("symbol")}</th>
                  <th className="px-4 py-2.5">{t("direction")}</th>
                  <th className="px-4 py-2.5">{t("entry")}</th>
                  <th className="px-4 py-2.5">SL</th>
                  <th className="px-4 py-2.5">TP</th>
                  <th className="px-4 py-2.5">{t("exitPrice")}</th>
                  <th className="px-4 py-2.5">{t("lotSize")}</th>
                  <th className="px-4 py-2.5">{t("result")}</th>
                  <th className="px-4 py-2.5">{t("pnl")}</th>
                  <th className="px-4 py-2.5">{t("notes")}</th>
                  <th className="px-4 py-2.5">{t("openedAt")}</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filtered.map((tr) => (
                  <TradeRow
                    key={tr.id}
                    trade={tr}
                    locale={locale}
                    isEditing={editingId === tr.id}
                    onEdit={() => setEditingId(editingId === tr.id ? null : tr.id)}
                    t={t}
                  />
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
