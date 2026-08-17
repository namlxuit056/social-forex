"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Radio } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import type { LiveSignal } from "@/app/api/signals/live/route";

type NewSignal = LiveSignal;

const POLL_MS = 30_000;

export function RealtimeSignalBanner() {
  const t = useTranslations("dashboard");
  const [newSignals, setNewSignals] = useState<NewSignal[]>([]);

  // Plain fetch on an interval instead of a server-held SSE connection — an
  // open ReadableStream keeps its Prisma connection (and the Neon compute
  // behind it) alive for as long as the dashboard tab stays open, regardless
  // of poll frequency, which is far more expensive than short-lived polls.
  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/signals/live?sinceMs=${POLL_MS + 15_000}`, {
          credentials: "include",
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { signals: LiveSignal[] };
        setNewSignals((prev) => {
          const prevIds = new Set(prev.map((s) => s.id));
          const fresh = data.signals.filter((s) => !prevIds.has(s.id));
          if (fresh.length === 0) return prev;
          return [...fresh, ...prev].slice(0, 5);
        });
      } catch {
        // Silent fail
      }
    }

    void poll();
    const timer = window.setInterval(() => void poll(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
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
