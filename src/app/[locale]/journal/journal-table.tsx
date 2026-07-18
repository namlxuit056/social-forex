"use client";

import { useState, useEffect } from "react";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Trash2, Pencil, X, Download } from "lucide-react";
import { deleteTrade, updateTrade } from "@/actions/journal";
import { realizedR } from "@/lib/journal/r-multiple";
import {
  TRADE_EMOTIONS,
  TRADE_SETUPS,
  useEmotionLabels,
  useSetupLabels,
} from "./use-setup-labels";
import { JournalImageField } from "./journal-image-field";
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
  setup: string | null;
  emotion: string | null;
  imageUrl: string | null;
  openedAt: string;
  closedAt: string | null;
}

type Filter = "ALL" | "WIN" | "LOSS" | "BREAKEVEN" | "PENDING";

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 16);
}

function toCsvCell(value: string | number | null): string {
  const str = value === null ? "" : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function exportTradesToCsv(trades: Trade[]): void {
  const headers = [
    "Symbol",
    "Direction",
    "Entry",
    "StopLoss",
    "TakeProfit",
    "ExitPrice",
    "LotSize",
    "Result",
    "PnL",
    "R",
    "Setup",
    "Emotion",
    "ImageUrl",
    "Notes",
    "OpenedAt",
    "ClosedAt",
  ];
  const rows = trades.map((tr) =>
    [
      tr.symbol,
      tr.direction,
      tr.entry,
      tr.stopLoss,
      tr.takeProfit,
      tr.exitPrice,
      tr.lotSize,
      tr.result,
      tr.pnl,
      realizedR(tr),
      tr.setup,
      tr.emotion,
      tr.imageUrl,
      tr.notes,
      tr.openedAt,
      tr.closedAt,
    ]
      .map(toCsvCell)
      .join(","),
  );
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `journal-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

function EditForm({ trade, onClose }: { trade: Trade; onClose: () => void }) {
  const t = useTranslations("journal");
  const setupLabels = useSetupLabels();
  const emotionLabels = useEmotionLabels();
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
            <Label>{t("setup")}</Label>
            <select name="setup" defaultValue={trade.setup ?? ""} className={`mt-1.5 ${SELECT_CLASS}`}>
              <option value="">{t("setupNone")}</option>
              {TRADE_SETUPS.map((s) => (
                <option key={s} value={s}>
                  {setupLabels[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>{t("emotion")}</Label>
            <select name="emotion" defaultValue={trade.emotion ?? ""} className={`mt-1.5 ${SELECT_CLASS}`}>
              <option value="">{t("emotionNone")}</option>
              {TRADE_EMOTIONS.map((e) => (
                <option key={e} value={e}>
                  {emotionLabels[e]}
                </option>
              ))}
            </select>
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
          <div className="sm:col-span-2 lg:col-span-3">
            <JournalImageField defaultUrl={trade.imageUrl} />
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
  const setupLabels = useSetupLabels();
  const emotionLabels = useEmotionLabels();
  const r = realizedR(trade);
  const subLabel = [
    trade.setup
      ? setupLabels[trade.setup as keyof typeof setupLabels] ?? trade.setup
      : null,
    trade.emotion
      ? emotionLabels[trade.emotion as keyof typeof emotionLabels] ?? trade.emotion
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <tr
      className={cn(
        "transition-colors hover:bg-muted/30",
        isPending && "opacity-60",
        isEditing && "bg-primary/5",
      )}
    >
      <td className="px-4 py-2.5 font-mono font-medium">
        {trade.symbol}
        {subLabel && (
          <span className="block font-sans text-[10px] font-normal text-muted-foreground">
            {subLabel}
          </span>
        )}
      </td>
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
      <td
        className={cn(
          "px-4 py-2.5 font-mono text-xs font-medium",
          r == null
            ? "text-muted-foreground/40"
            : r >= 0
              ? "text-emerald-500"
              : "text-red-500",
        )}
      >
        {r != null && !isPending ? `${r >= 0 ? "+" : ""}${r.toFixed(2)}R` : "—"}
      </td>
      <td className="max-w-40 px-4 py-2.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          {trade.imageUrl && (
            <a
              href={trade.imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- thumbnail Blob nhỏ */}
              <img
                src={trade.imageUrl}
                alt=""
                className="h-8 w-12 rounded border border-border/60 object-cover"
              />
            </a>
          )}
          {trade.notes ? (
            <span title={trade.notes} className="block truncate">
              {trade.notes}
            </span>
          ) : (
            !trade.imageUrl && <span className="text-muted-foreground/40">—</span>
          )}
        </div>
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

const TABLE_PAGE_SIZE = 200;

export function JournalTable({ trades, locale }: { trades: Trade[]; locale: string }) {
  const t = useTranslations("journal");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(TABLE_PAGE_SIZE);

  const counts = {
    ALL: trades.length,
    WIN: trades.filter((tr) => tr.result === "WIN").length,
    LOSS: trades.filter((tr) => tr.result === "LOSS").length,
    BREAKEVEN: trades.filter((tr) => tr.result === "BREAKEVEN").length,
    PENDING: trades.filter((tr) => tr.result === "PENDING").length,
  };

  const filtered = filter === "ALL" ? trades : trades.filter((tr) => tr.result === filter);
  // CSV export vẫn dùng `filtered` đầy đủ — chỉ giới hạn số hàng render cho DOM nhẹ
  const visible = filtered.slice(0, visibleCount);
  const hasMoreRows = filtered.length > visibleCount;

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
          <div className="flex flex-wrap items-center gap-2">
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-auto gap-1.5 px-2.5 py-1 text-xs"
              disabled={filtered.length === 0}
              onClick={() => exportTradesToCsv(filtered)}
            >
              <Download className="size-3.5" />
              {t("exportCsv")}
            </Button>
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
                  <th className="px-4 py-2.5">R</th>
                  <th className="px-4 py-2.5">{t("notes")}</th>
                  <th className="px-4 py-2.5">{t("openedAt")}</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {visible.map((tr) => (
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
          {hasMoreRows && (
            <div className="flex flex-col items-center gap-1 border-t border-border/40 px-4 py-3">
              <p className="text-xs text-muted-foreground">
                {t("tableShowingRows", { shown: visible.length, total: filtered.length })}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setVisibleCount((c) => c + TABLE_PAGE_SIZE)}
              >
                {t("tableShowMore")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
