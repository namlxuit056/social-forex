"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";

const POLL_MS = 10_000;

/** Polls an unfinished run and re-renders the page once it is DONE or ERROR. */
export function TradingAgentsRunPoller({ runId }: { runId: string }) {
  const router = useRouter();

  useEffect(() => {
    let stopped = false;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/trading-agents/runs/${runId}`, { cache: "no-store" });
        if (!res.ok) return;
        const { status } = (await res.json()) as { status: string };
        if (!stopped && (status === "DONE" || status === "ERROR")) {
          stopped = true;
          clearInterval(timer);
          router.refresh();
        }
      } catch {
        // transient — try again next tick
      }
    }, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [runId, router]);

  return null;
}
