"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Radio } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";

type NewSignal = {
  id: string;
  symbol: string;
  direction: string;
  tier: string;
  author: string;
};

export function RealtimeSignalBanner() {
  const t = useTranslations("dashboard");
  const [newSignals, setNewSignals] = useState<NewSignal[]>([]);

  useEffect(() => {
    const eventSource = new EventSource("/api/sse/signals");

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "new_signal") {
          setNewSignals((prev) => {
            const exists = prev.some((s) => s.id === data.signal.id);
            if (exists) return prev;
            return [data.signal, ...prev].slice(0, 5);
          });
        }
      } catch {
        // Silent fail
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => eventSource.close();
  }, []);

  useEffect(() => {
    if (newSignals.length === 0) return;
    const timer = setTimeout(() => {
      setNewSignals((prev) => prev.slice(1));
    }, 10_000);
    return () => clearTimeout(timer);
  }, [newSignals]);

  if (newSignals.length === 0) return null;

  return (
    <div className="space-y-2">
      {newSignals.map((signal) => (
        <div
          key={signal.id}
          className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm animate-in slide-in-from-top-2 fade-in"
        >
          <Radio className="size-4 shrink-0 text-primary animate-pulse" />
          <Link
            href={`/signals/${signal.id}`}
            className="flex-1 font-mono font-medium text-foreground hover:text-primary"
          >
            {signal.symbol} {signal.direction}
          </Link>
          <Badge variant="outline" className="text-[10px]">
            {signal.tier}
          </Badge>
          <span className="text-xs text-muted-foreground">{signal.author}</span>
        </div>
      ))}
    </div>
  );
}
