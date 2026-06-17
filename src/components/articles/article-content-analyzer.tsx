"use client";

import { useState } from "react";
import Image from "next/image";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Info,
  Loader2,
  RotateCcw,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AnalyzeContentResult } from "@/app/api/ai/articles/analyze-content/route";
import type { ArticleEditorCKHandle } from "./article-editor-ck";

type Props = {
  keyword: string;
  title: string;
  locale: string;
  getBody: () => string;
  editorRef: React.RefObject<ArticleEditorCKHandle | null>;
};

type ImageResult = { url: string; alt: string; credit: string };
type ImageState = "idle" | "loading" | "done" | "error";

function SeverityIcon({ s }: { s: "error" | "warning" | "info" }) {
  if (s === "error") return <AlertCircle className="size-3.5 shrink-0 text-destructive" />;
  if (s === "warning") return <AlertTriangle className="size-3.5 shrink-0 text-amber-400" />;
  return <Info className="size-3.5 shrink-0 text-blue-400" />;
}

function severityClass(s: "error" | "warning" | "info") {
  if (s === "error") return "border-destructive/30 bg-destructive/5";
  if (s === "warning") return "border-amber-400/30 bg-amber-400/5";
  return "border-blue-400/30 bg-blue-400/5";
}

export function ArticleContentAnalyzer({ keyword, title, locale, getBody, editorRef }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeContentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rewriteApplied, setRewriteApplied] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [imageStates, setImageStates] = useState<Record<number, ImageState>>({});
  const [imageResults, setImageResults] = useState<Record<number, ImageResult>>({});

  async function analyze() {
    const body = getBody();
    if (!body.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setRewriteApplied(false);
    setImageStates({});
    setImageResults({});
    setExpanded(true);

    try {
      const res = await fetch("/api/ai/articles/analyze-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword, title, locale, body }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setResult((await res.json()) as AnalyzeContentResult);
    } catch {
      setError("Không thể phân tích. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  function applyRewrite() {
    if (!result?.rewrittenBody) return;
    editorRef.current?.setData(result.rewrittenBody);
    setRewriteApplied(true);
  }

  async function fetchImage(index: number, searchKeyword: string) {
    setImageStates((s) => ({ ...s, [index]: "loading" }));
    try {
      const res = await fetch(
        `/api/ai/articles/fetch-image?keyword=${encodeURIComponent(searchKeyword)}`,
      );
      if (!res.ok) throw new Error();
      const img = (await res.json()) as ImageResult;
      setImageResults((r) => ({ ...r, [index]: img }));
      setImageStates((s) => ({ ...s, [index]: "done" }));
    } catch {
      setImageStates((s) => ({ ...s, [index]: "error" }));
    }
  }

  function insertImage(index: number, caption: string) {
    const img = imageResults[index];
    if (!img) return;
    editorRef.current?.insertImage(img.url, caption);
  }

  return (
    <div className="space-y-3">
      {/* Trigger button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full gap-2 border-primary/40 text-primary hover:bg-primary/10"
        onClick={analyze}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <WandSparkles className="size-3.5" />
        )}
        {loading ? "Đang phân tích nội dung..." : "Phân tích & Cải thiện với AI"}
      </Button>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {result && (
        <div className="rounded-lg border border-border/60 bg-muted/10">
          {/* Header */}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex w-full items-center justify-between px-3 py-2.5 text-left"
          >
            <span className="flex items-center gap-2 text-xs font-medium text-foreground">
              <Sparkles className="size-3.5 text-primary" />
              Kết quả phân tích AI
              <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                {result.weakSections.length} vấn đề
              </Badge>
            </span>
            {expanded ? (
              <ChevronUp className="size-3.5 text-muted-foreground" />
            ) : (
              <ChevronDown className="size-3.5 text-muted-foreground" />
            )}
          </button>

          {expanded && (
            <div className="space-y-4 border-t border-border/40 px-3 pb-4 pt-3">
              {/* Overall */}
              <p className="text-xs leading-relaxed text-muted-foreground">{result.overall}</p>

              {/* Weak sections */}
              {result.weakSections.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Phần cần cải thiện
                  </p>
                  {result.weakSections.map((s, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex items-start gap-2 rounded-md border p-2 text-xs",
                        severityClass(s.severity),
                      )}
                    >
                      <SeverityIcon s={s.severity} />
                      <div>
                        <p className="font-medium text-foreground">{s.heading}</p>
                        <p className="mt-0.5 text-muted-foreground">{s.issue}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Apply rewrite */}
              <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
                <p className="mb-2 text-xs font-medium text-foreground">
                  Bài viết đã được AI cải thiện
                </p>
                <p className="mb-3 text-xs text-muted-foreground">
                  AI đã viết lại toàn bộ nội dung với ngữ cảnh thị trường cụ thể,
                  loại bỏ nội dung chung chung và bổ sung disclaimer rủi ro.
                </p>
                {rewriteApplied ? (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                    <CheckCircle2 className="size-3.5" />
                    Đã áp dụng vào editor
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 gap-1.5 text-xs"
                      onClick={applyRewrite}
                    >
                      <RotateCcw className="size-3" />
                      Áp dụng bài viết cải thiện
                    </Button>
                  </div>
                )}
              </div>

              {/* Image suggestions */}
              {result.imageSuggestions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Gợi ý thêm hình ảnh
                  </p>
                  {result.imageSuggestions.map((suggestion, i) => {
                    const imgState = imageStates[i] ?? "idle";
                    const imgResult = imageResults[i];
                    return (
                      <div
                        key={i}
                        className="rounded-md border border-border/50 bg-background/50 p-2.5 text-xs"
                      >
                        <p className="font-medium text-foreground">{suggestion.location}</p>
                        <p className="mt-0.5 text-muted-foreground">
                          Caption: <em>{suggestion.caption}</em>
                        </p>

                        {/* Image preview */}
                        {imgResult && (
                          <div className="mt-2 overflow-hidden rounded border border-border/40">
                            <Image
                              src={imgResult.url}
                              alt={imgResult.alt}
                              width={400}
                              height={210}
                              className="h-28 w-full object-cover"
                            />
                            <p className="px-2 py-1 text-[10px] text-muted-foreground">
                              {imgResult.credit}
                            </p>
                          </div>
                        )}

                        <div className="mt-2 flex gap-2">
                          {imgState !== "done" && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-6 gap-1 px-2 text-[10px]"
                              disabled={imgState === "loading"}
                              onClick={() => fetchImage(i, suggestion.searchKeyword)}
                            >
                              {imgState === "loading" ? (
                                <Loader2 className="size-3 animate-spin" />
                              ) : (
                                <ImageIcon className="size-3" />
                              )}
                              {imgState === "error" ? "Thử lại" : "Tìm ảnh"}
                            </Button>
                          )}
                          {imgState === "done" && (
                            <Button
                              type="button"
                              size="sm"
                              className="h-6 gap-1 px-2 text-[10px]"
                              onClick={() => insertImage(i, suggestion.caption)}
                            >
                              <CheckCircle2 className="size-3" />
                              Chèn vào bài
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
