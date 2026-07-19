"use client";

import { useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deletePriceAlert } from "@/actions/price-alerts";
import { useTranslations } from "next-intl";
import { Repeat, Trash2 } from "lucide-react";

type Alert = {
  id: string;
  symbol: string;
  targetPrice: number;
  direction: string;
  isActive: boolean;
  isRecurring: boolean;
  cooldownMinutes: number;
  triggeredAt: string | null;
  createdAt: string;
};

export function PriceAlertList({ alerts }: { alerts: Alert[] }) {
  const t = useTranslations("alerts");
  const [isPending, startTransition] = useTransition();

  if (alerts.length === 0) {
    return <p className="text-sm text-muted-foreground py-6 text-center">{t("empty")}</p>;
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deletePriceAlert(id);
    });
  }

  return (
    <ul className="space-y-2">
      {alerts.map((alert) => (
        <li
          key={alert.id}
          className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 ${
            !alert.isActive ? "opacity-50" : ""
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Badge variant="outline" className="shrink-0 font-mono text-xs">
              {alert.symbol}
            </Badge>
            <span className="text-sm font-medium">
              {alert.direction === "ABOVE" ? "▲" : "▼"} {alert.targetPrice}
            </span>
            {alert.isRecurring && (
              <Badge variant="secondary" className="shrink-0 gap-1 text-xs">
                <Repeat className="h-3 w-3" />
                {t("recurringBadge", { minutes: alert.cooldownMinutes })}
              </Badge>
            )}
            {(!alert.isActive || alert.isRecurring) && alert.triggeredAt && (
              <span className="text-xs text-muted-foreground truncate">
                {t(alert.isRecurring ? "lastTriggered" : "triggered")}{" "}
                {new Date(alert.triggeredAt).toLocaleDateString("vi-VN", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
            {alert.isActive && (
              <Badge className="text-xs bg-green-500/15 text-green-700 border-green-200 dark:text-green-400">
                {t("active")}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            disabled={isPending}
            onClick={() => handleDelete(alert.id)}
            aria-label={t("delete")}
            className="shrink-0 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </li>
      ))}
    </ul>
  );
}
