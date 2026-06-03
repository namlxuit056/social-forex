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

interface Trade {
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

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 16);
}

function EditForm({
  trade,
  onClose,
}: {
  trade: Trade;
  onClose: () => void;
}) {
  const t = useTranslations("journal");
  const [state, formAction, isPending] = useActionState(updateTrade, null);

  useEffect(() => {
    if (state?.ok) onClose();
  }, [state?.ok, onClose]);

  const selectClass =
    "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

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
            <select name="direction" defaultValue={trade.direction} className={`mt-1.5 ${selectClass}`}>
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
            <select name="result" defaultValue={trade.result} className={`mt-1.5 ${selectClass}`}>
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

export function JournalTable({
  trades,
  locale,
}: {
  trades: Trade[];
  locale: string;
}) {
  const t = useTranslations("journal");
  const [editingId, setEditingId] = useState<string | null>(null);

  const resultBadge = (r: string) => {
    if (r === "WIN") return "bg-emerald-500/15 text-emerald-500";
    if (r === "LOSS") return "bg-red-500/15 text-red-500";
    if (r === "BREAKEVEN") return "bg-yellow-500/15 text-yellow-500";
    return "bg-muted text-muted-foreground";
  };

  const resultLabel = (r: string) => {
    if (r === "WIN") return t("win");
    if (r === "LOSS") return t("loss");
    if (r === "BREAKEVEN") return t("breakeven");
    return t("pending");
  };

  return (
    <div className="space-y-4">
      {editingId && (
        <EditForm
          trade={trades.find((tr) => tr.id === editingId)!}
          onClose={() => setEditingId(null)}
        />
      )}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">{t("history")}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
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
                <th className="px-4 py-2.5">{t("openedAt")}</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {trades.map((tr) => (
                <tr key={tr.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-4 py-2.5 font-mono font-medium">{tr.symbol}</td>
                  <td className="px-4 py-2.5">
                    <Badge
                      variant={tr.direction === "LONG" ? "default" : "destructive"}
                      className="text-[11px]"
                    >
                      {tr.direction}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs">{tr.entry}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{tr.stopLoss ?? "—"}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{tr.takeProfit ?? "—"}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{tr.exitPrice ?? "—"}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{tr.lotSize ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={cn(
                        "inline-block rounded-full px-2 py-0.5 text-[11px] font-medium",
                        resultBadge(tr.result),
                      )}
                    >
                      {resultLabel(tr.result)}
                    </span>
                  </td>
                  <td
                    className={cn(
                      "px-4 py-2.5 font-mono text-xs font-medium",
                      tr.pnl != null && tr.pnl >= 0 ? "text-emerald-500" : "text-red-500",
                    )}
                  >
                    {tr.pnl != null
                      ? tr.pnl >= 0
                        ? `+$${tr.pnl.toFixed(2)}`
                        : `-$${Math.abs(tr.pnl).toFixed(2)}`
                      : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {new Date(tr.openedAt).toLocaleDateString(locale)}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-foreground"
                        onClick={() => setEditingId(editingId === tr.id ? null : tr.id)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <form
                        action={deleteTrade}
                        onSubmit={(e) => {
                          if (!confirm(t("deleteConfirm"))) e.preventDefault();
                        }}
                      >
                        <input type="hidden" name="tradeId" value={tr.id} />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
