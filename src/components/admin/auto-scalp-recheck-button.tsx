"use client";

import { useState, useTransition } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { recheckAutoScalpPendingAction } from "@/actions/scalping";
import type { AutoScalpRecheckResult } from "@/lib/scalping/auto-scalp-recheck";
import { cn } from "@/lib/utils";

const ERROR_LABELS: Record<string, string> = {
  forbidden: "Không có quyền",
  invalid_params: "Tham số không hợp lệ",
  rate_limited: "Thử lại sau ít phút",
  proposal_not_found: "Không tìm thấy đề xuất",
  signal_not_found: "Không tìm thấy tín hiệu",
  not_pending: "Lệnh không còn ở trạng thái chờ khớp",
  symbol_not_found: "Symbol không được hỗ trợ",
  ai_unavailable: "Chưa cấu hình AI API key",
  ai_error: "AI lỗi, thử lại sau",
  internal_error: "Lỗi hệ thống",
};

export function AutoScalpRecheckButton({ proposalId }: { proposalId: string }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<AutoScalpRecheckResult | null>(null);

  function run() {
    setResult(null);
    startTransition(async () => {
      try {
        setResult(await recheckAutoScalpPendingAction(proposalId));
      } catch {
        setResult({ ok: false, error: "ai_error" });
      }
    });
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className="inline-flex h-7 items-center gap-1.5 rounded-md border border-input bg-background px-2 text-xs font-medium hover:bg-accent disabled:opacity-50"
      >
        {pending ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
        {pending ? "Đang phân tích…" : "Re-check"}
      </button>

      {result && !result.ok && (
        <p className="max-w-xs text-xs text-destructive">
          Lỗi: {ERROR_LABELS[result.error] ?? result.error}
          {result.detail && <span className="block text-muted-foreground">{result.detail}</span>}
        </p>
      )}

      {result && result.ok && (
        <div className="max-w-xs space-y-1 rounded-md border border-border/60 bg-muted/30 p-2">
          <p className="text-xs font-semibold">
            <span
              className={cn(
                result.verdict === "kept"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-destructive",
              )}
            >
              {result.verdict === "kept" ? "✓ Giữ lệnh" : "✕ Đã huỷ lệnh"}
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            AI mới: {result.newDirection}
            {result.newDirection !== result.oldDirection && ` (đổi từ ${result.oldDirection})`} · score{" "}
            {result.newScore}/{result.minScore} · conf {result.newConfidence}/{result.minConfidence}
          </p>
          {result.verdict === "cancelled" && result.mt5CancelQueued && (
            <p className="text-xs text-muted-foreground">Đã gửi lệnh huỷ order xuống MT5 bridge.</p>
          )}
          {result.verdict === "cancelled" && !result.mt5CancelQueued && (
            <p className="text-xs text-amber-600 dark:text-amber-500">
              Tín hiệu đã huỷ nhưng không có MT5 ticket để gửi lệnh huỷ — kiểm tra thủ công.
            </p>
          )}
          <p className="whitespace-pre-wrap text-xs text-muted-foreground">{result.reasoning}</p>
        </div>
      )}
    </div>
  );
}
