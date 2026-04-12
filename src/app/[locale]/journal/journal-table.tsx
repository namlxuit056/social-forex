"use client";

import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { deleteTrade } from "@/actions/journal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export function JournalTable({
  trades,
  locale,
}: {
  trades: Trade[];
  locale: string;
}) {
  const t = useTranslations("journal");

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
                <td className="px-4 py-2.5 font-mono font-medium">
                  {tr.symbol}
                </td>
                <td className="px-4 py-2.5">
                  <Badge
                    variant={
                      tr.direction === "LONG" ? "default" : "destructive"
                    }
                    className="text-[11px]"
                  >
                    {tr.direction}
                  </Badge>
                </td>
                <td className="px-4 py-2.5 font-mono text-xs">{tr.entry}</td>
                <td className="px-4 py-2.5 font-mono text-xs">
                  {tr.stopLoss ?? "—"}
                </td>
                <td className="px-4 py-2.5 font-mono text-xs">
                  {tr.takeProfit ?? "—"}
                </td>
                <td className="px-4 py-2.5 font-mono text-xs">
                  {tr.exitPrice ?? "—"}
                </td>
                <td className="px-4 py-2.5 font-mono text-xs">
                  {tr.lotSize ?? "—"}
                </td>
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
                    tr.pnl != null && tr.pnl >= 0
                      ? "text-emerald-500"
                      : "text-red-500",
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
