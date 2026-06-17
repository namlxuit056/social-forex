"use client";

import { useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Info,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SeoCheckResult, SeoIssue } from "@/app/api/ai/articles/seo-check/route";

type Fields = {
  keyword: string;
  title: string;
  summary: string;
  metaDescription: string;
  body: string;
};

type Props = {
  fields: Fields;
  onApplyFix: (field: keyof Omit<Fields, "keyword" | "body">, value: string) => void;
};

type InstantMetric = {
  label: string;
  value: string;
  status: "ok" | "warn" | "error";
};

function computeInstantMetrics(fields: Fields): InstantMetric[] {
  const wordCount = fields.body.split(/\s+/).filter(Boolean).length;
  const h2Count = (fields.body.match(/^## /gm) ?? []).length;
  const titleLen = fields.title.length;
  const metaLen = fields.metaDescription.length;
  const hasDisclaimer = /disclaimer|rủi ro|cảnh báo/i.test(fields.body);
  const keywordInTitle = fields.title
    .toLowerCase()
    .includes(fields.keyword.toLowerCase());
  const keywordInMeta = fields.metaDescription
    .toLowerCase()
    .includes(fields.keyword.toLowerCase());

  return [
    {
      label: "Tiêu đề",
      value: `${titleLen} ký tự`,
      status: titleLen >= 40 && titleLen <= 70 ? "ok" : titleLen < 40 ? "error" : "warn",
    },
    {
      label: "Meta description",
      value: `${metaLen} ký tự`,
      status: metaLen >= 140 && metaLen <= 165 ? "ok" : metaLen < 140 ? "warn" : "error",
    },
    {
      label: "Số từ",
      value: `${wordCount} từ`,
      status: wordCount >= 600 ? "ok" : wordCount >= 350 ? "warn" : "error",
    },
    {
      label: "Số mục H2",
      value: `${h2Count} mục`,
      status: h2Count >= 5 ? "ok" : h2Count >= 3 ? "warn" : "error",
    },
    {
      label: "Keyword trong tiêu đề",
      value: keywordInTitle ? "Có" : "Không",
      status: keywordInTitle ? "ok" : "error",
    },
    {
      label: "Keyword trong meta",
      value: keywordInMeta ? "Có" : "Không",
      status: keywordInMeta ? "ok" : "warn",
    },
    {
      label: "Disclaimer",
      value: hasDisclaimer ? "Có" : "Không",
      status: hasDisclaimer ? "ok" : "error",
    },
  ];
}

function severityIcon(severity: SeoIssue["severity"]) {
  if (severity === "error") return <AlertCircle className="size-3.5 text-destructive" />;
  if (severity === "warning") return <AlertTriangle className="size-3.5 text-amber-400" />;
  return <Info className="size-3.5 text-blue-400" />;
}

function severityLabel(severity: SeoIssue["severity"]) {
  if (severity === "error") return "Lỗi";
  if (severity === "warning") return "Cảnh báo";
  return "Gợi ý";
}

function severityBadgeClass(severity: SeoIssue["severity"]) {
  if (severity === "error") return "border-destructive/40 bg-destructive/10 text-destructive";
  if (severity === "warning") return "border-amber-400/40 bg-amber-400/10 text-amber-400";
  return "border-blue-400/40 bg-blue-400/10 text-blue-400";
}

function ScoreRing({ score }: { score: number }) {
  const color =
    score >= 80 ? "text-emerald-400" : score >= 55 ? "text-amber-400" : "text-destructive";
  return (
    <div className={cn("text-center", color)}>
      <p className="text-4xl font-bold tabular-nums">{score}</p>
      <p className="text-xs text-muted-foreground">/ 100</p>
    </div>
  );
}

export function ArticleSeoPanel({ fields, onApplyFix }: Props) {
  const [result, setResult] = useState<SeoCheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState<Set<number>>(new Set());

  const metrics = computeInstantMetrics(fields);

  async function runCheck() {
    setLoading(true);
    setError(null);
    setResult(null);
    setApplied(new Set());

    try {
      const res = await fetch("/api/ai/articles/seo-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as SeoCheckResult;
      setResult(data);
    } catch {
      setError("Không thể chạy AI check. Thử lại sau.");
    } finally {
      setLoading(false);
    }
  }

  function applyFix(index: number, issue: SeoIssue) {
    if (!issue.fix || issue.field === "body") return;
    onApplyFix(issue.field, issue.fix);
    setApplied((prev) => new Set([...prev, index]));
  }

  return (
    <div className="space-y-4">
      {/* Instant metrics */}
      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Kiểm tra nhanh
        </p>
        <ul className="space-y-1.5">
          {metrics.map((m) => (
            <li key={m.label} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{m.label}</span>
              <span
                className={cn(
                  "flex items-center gap-1 font-medium",
                  m.status === "ok" && "text-emerald-400",
                  m.status === "warn" && "text-amber-400",
                  m.status === "error" && "text-destructive",
                )}
              >
                {m.status === "ok" ? (
                  <CheckCircle2 className="size-3" />
                ) : m.status === "warn" ? (
                  <AlertTriangle className="size-3" />
                ) : (
                  <AlertCircle className="size-3" />
                )}
                {m.value}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-border/60" />

      {/* AI check */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full gap-2"
        onClick={runCheck}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Sparkles className="size-3.5" />
        )}
        {loading ? "Đang phân tích..." : "Phân tích SEO bằng AI"}
      </Button>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {result && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Điểm SEO
            </p>
            <ScoreRing score={result.score} />
          </div>

          {result.issues.length === 0 ? (
            <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">
              <CheckCircle2 className="size-3.5 shrink-0" />
              Bài viết đạt chuẩn SEO tốt.
            </div>
          ) : (
            <ul className="space-y-2">
              {result.issues.map((issue, i) => (
                <li
                  key={i}
                  className="rounded-md border border-border/60 bg-muted/20 p-2.5 text-xs"
                >
                  <div className="flex items-start gap-2">
                    {severityIcon(issue.severity)}
                    <div className="flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className={cn("px-1.5 py-0 text-[10px]", severityBadgeClass(issue.severity))}
                        >
                          {severityLabel(issue.severity)}
                        </Badge>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {issue.field}
                        </span>
                      </div>
                      <p className="leading-relaxed text-foreground/80">{issue.message}</p>

                      {issue.fix && issue.field !== "body" && (
                        <div className="mt-1.5 rounded border border-border/40 bg-background/60 px-2 py-1.5">
                          <p className="mb-1 text-[10px] text-muted-foreground">Gợi ý:</p>
                          <p className="leading-relaxed text-foreground/90 italic">
                            &ldquo;{issue.fix}&rdquo;
                          </p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className={cn(
                              "mt-1.5 h-6 gap-1 px-2 text-[10px]",
                              applied.has(i)
                                ? "text-emerald-400"
                                : "text-primary hover:text-primary",
                            )}
                            onClick={() => applyFix(i, issue)}
                            disabled={applied.has(i)}
                          >
                            <ClipboardCheck className="size-3" />
                            {applied.has(i) ? "Đã áp dụng" : "Áp dụng"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
