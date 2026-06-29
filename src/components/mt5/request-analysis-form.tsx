"use client";

import { useState, useTransition } from "react";
import { useRouter, useParams } from "next/navigation";
import { BrainCircuit, Loader2 } from "lucide-react";
import { requestAiAnalysis } from "@/actions/ai-trade-proposal";
import { QUOTE_DEFINITIONS } from "@/lib/quotes/definitions";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

type Props = {
  hasConnection: boolean;
};

const ERROR_LABELS: Record<string, string> = {
  vip_required: "This feature is VIP only",
  no_connection: "Create an MT5 connection first",
  rate_limited: "Too many requests, try again in 1 minute",
  ai_unavailable: "DEEPSEEK_API_KEY not configured in .env",
  analysis_failed: "Analysis failed — try again",
  unknown_symbol: "Invalid symbol",
};

export function RequestAnalysisForm({ hasConnection }: Props) {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) === "en" ? "en" : "vi";
  const [symbol, setSymbol] = useState("XAUUSD");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("idle");
    startTransition(async () => {
      const result = await requestAiAnalysis(symbol, locale);
      if (result.ok) {
        setStatus("success");
        router.refresh();
        setTimeout(() => setStatus("idle"), 4000);
      } else {
        setStatus("error");
        setErrorMsg(ERROR_LABELS[result.error ?? ""] ?? result.error ?? "Unknown error");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      <select
        value={symbol}
        onChange={(e) => setSymbol(e.target.value)}
        disabled={!hasConnection || isPending}
        className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
      >
        {QUOTE_DEFINITIONS.map((q) => (
          <option key={q.symbol} value={q.symbol}>
            {q.symbol} — {q.name}
          </option>
        ))}
      </select>

      <Button type="submit" size="sm" disabled={!hasConnection || isPending}>
        {isPending ? (
          <>
            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            Analysing…
          </>
        ) : (
          <>
            <BrainCircuit className="mr-1.5 size-3.5" />
            AI Analysis
          </>
        )}
      </Button>

      {!hasConnection && (
        <span className="text-xs text-muted-foreground">
          Create an MT5 connection above first
        </span>
      )}
      {status === "success" && (
        <span className="text-xs text-green-500 font-medium">
          ✓ Analysing — results will appear below
        </span>
      )}
      {status === "error" && (
        <span className="flex items-center gap-2 text-xs text-destructive">
          {errorMsg}
          {errorMsg === ERROR_LABELS.vip_required && (
            <Link
              href="/upgrade-vip"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              Upgrade VIP
            </Link>
          )}
        </span>
      )}
    </form>
  );
}
