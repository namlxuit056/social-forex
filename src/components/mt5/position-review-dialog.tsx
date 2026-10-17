"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { tradeActionBadge } from "./trade-action-badge";
import type { AiPositionReviewResponse, AiSuggestError } from "@/lib/ai/types";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ticket: string;
  symbol: string;
};

export function PositionReviewDialog({ open, onOpenChange, ticket, symbol }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AiPositionReviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function analyze() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/position-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ticket }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as AiSuggestError;
        setError(body.error ?? "Unable to review this position right now");
        return;
      }
      setData((await res.json()) as AiPositionReviewResponse);
    } catch {
      setError("Unable to review this position right now");
    } finally {
      setLoading(false);
    }
  }

  // Re-run automatically each time the dialog is opened for a (possibly different) ticket.
  useEffect(() => {
    if (!open) return;
    setData(null);
    setError(null);
    void analyze();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ticket]);

  const review = data?.review;
  const badge = review ? tradeActionBadge(review.action) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            AI Trend Check — {symbol} #{ticket}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {loading && (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              Analyzing the current chart…
            </div>
          )}

          {!loading && error && (
            <div className="rounded-lg border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {!loading && review && badge && (
            <>
              <div className="flex items-center gap-3">
                <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full border", badge.className)}>
                  <badge.icon className="size-4" aria-hidden />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn("text-[10px] uppercase", badge.className)}>
                      {review.action}
                    </Badge>
                    <span className="text-xs capitalize text-muted-foreground">
                      Trend: {review.trendAlignment}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Confidence {review.confidence}/5</p>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <p className="text-sm leading-relaxed text-foreground">{review.summary}</p>
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase text-muted-foreground">Reasoning</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-foreground">{review.reasoning}</p>
              </div>

              {review.invalidationLevel != null && (
                <p className="text-xs text-muted-foreground">
                  Invalidation level: <span className="font-mono text-foreground">{review.invalidationLevel}</span>
                </p>
              )}

              <p className="text-xs leading-relaxed text-muted-foreground">{data?.disclaimer}</p>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={() => void analyze()} disabled={loading}>
            {loading ? "Analyzing…" : "Re-check"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
