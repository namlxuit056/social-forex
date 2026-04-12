"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import type { QuoteRow, QuotesSource } from "@/lib/quotes/types";
import { cn } from "@/lib/utils";

type Props = {
  initial: QuoteRow[];
  initialSource?: QuotesSource;
  initialWarning?: string;
  initialUpdatedAt?: string;
};

type PollPayload = {
  updatedAt: string;
  quotes: QuoteRow[];
  source?: QuotesSource;
  warning?: string;
  error?: string;
};

export function LiveQuotesTable({
  initial,
  initialSource,
  initialWarning,
  initialUpdatedAt,
}: Props) {
  const [rows, setRows] = useState(initial);
  const [updatedAt, setUpdatedAt] = useState<string | null>(
    initialUpdatedAt ?? null,
  );
  const [source, setSource] = useState<QuotesSource | undefined>(initialSource);
  const [warning, setWarning] = useState<string | undefined>(initialWarning);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const applyPayload = useCallback((data: PollPayload) => {
    if (data.error) {
      setFetchError(data.error);
      return;
    }
    setFetchError(null);
    if (Array.isArray(data.quotes) && data.quotes.length > 0) {
      setRows(data.quotes);
    }
    setUpdatedAt(data.updatedAt);
    setSource(data.source);
    setWarning(data.warning);
  }, []);

  useEffect(() => {
    const poll = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/quotes");
        const data = (await res.json()) as PollPayload;
        if (!res.ok) {
          setFetchError(data.error ?? `HTTP ${res.status}`);
          return;
        }
        applyPayload(data);
      } catch (e) {
        setFetchError(e instanceof Error ? e.message : "Network error");
      } finally {
        setLoading(false);
      }
    };

    const id = setInterval(poll, 15_000);
    return () => clearInterval(id);
  }, [applyPayload]);

  const groups = ["major", "minor", "metal", "energy", "crypto"] as const;
  const labels: Record<(typeof groups)[number], string> = {
    major: "Major",
    minor: "Minor / Cross",
    metal: "Kim loại",
    energy: "Năng lượng",
    crypto: "Crypto",
  };

  const sourceLabel =
    source === "yahoo"
      ? "Yahoo Finance"
      : source === "mock"
        ? "Mô phỏng (mock)"
        : source === "mock_fallback"
          ? "Mô phỏng (fallback)"
          : "—";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {loading && (
          <span className="inline-flex items-center gap-1">
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            Đang làm mới…
          </span>
        )}
        {updatedAt && (
          <span>
            Cập nhật:{" "}
            {new Date(updatedAt).toLocaleString("vi-VN", {
              timeZone: "Asia/Ho_Chi_Minh",
            })}{" "}
            (VN)
          </span>
        )}
        <span className="rounded-md bg-muted/80 px-2 py-0.5 font-mono text-[10px] text-foreground/80">
          Nguồn: {sourceLabel}
        </span>
      </div>

      {(warning || fetchError) && (
        <div
          className={cn(
            "flex gap-2 rounded-lg border px-3 py-2 text-sm",
            fetchError
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : "border-amber-500/30 bg-amber-500/10 text-amber-100/90",
          )}
          role="alert"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>{fetchError ?? warning}</p>
        </div>
      )}

      <div className="space-y-6">
        {groups.map((g) => {
          const subset = rows.filter((r) => r.group === g);
          if (!subset.length) return null;
          return (
            <section key={g}>
              <h3 className="mb-2 text-sm font-medium text-primary">{labels[g]}</h3>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Cặp</th>
                      <th className="px-3 py-2 font-medium">Bid</th>
                      <th className="px-3 py-2 font-medium">Ask</th>
                      <th className="px-3 py-2 font-medium">Δ%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {subset.map((r) => (
                      <tr key={r.symbol} className="hover:bg-muted/40">
                        <td className="px-3 py-2">
                          <span className="font-mono font-medium text-foreground">
                            {r.symbol}
                          </span>
                          <span className="ml-2 text-muted-foreground">{r.name}</span>
                        </td>
                        <td className="px-3 py-2 font-mono text-primary">{r.bid}</td>
                        <td className="px-3 py-2 font-mono text-chart-3">{r.ask}</td>
                        <td
                          className={cn(
                            "px-3 py-2 font-mono",
                            r.changePct >= 0 ? "text-primary" : "text-destructive",
                          )}
                        >
                          {r.changePct >= 0 ? "+" : ""}
                          {r.changePct}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
