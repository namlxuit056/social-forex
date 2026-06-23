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
  vip_required: "Tính năng này chỉ dành cho VIP",
  no_connection: "Tạo MT5 connection trước",
  rate_limited: "Quá nhiều request, thử lại sau 1 phút",
  ai_unavailable: "Chưa cấu hình DEEPSEEK_API_KEY trong .env",
  analysis_failed: "Phân tích thất bại — thử lại",
  unknown_symbol: "Symbol không hợp lệ",
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
        setErrorMsg(ERROR_LABELS[result.error ?? ""] ?? result.error ?? "Lỗi không xác định");
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
            Đang phân tích…
          </>
        ) : (
          <>
            <BrainCircuit className="mr-1.5 size-3.5" />
            Phân tích AI
          </>
        )}
      </Button>

      {!hasConnection && (
        <span className="text-xs text-muted-foreground">
          Tạo MT5 connection ở trên trước
        </span>
      )}
      {status === "success" && (
        <span className="text-xs text-green-500 font-medium">
          ✓ Đang phân tích, kết quả xuất hiện bên dưới
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
              Nâng cấp VIP
            </Link>
          )}
        </span>
      )}
    </form>
  );
}
