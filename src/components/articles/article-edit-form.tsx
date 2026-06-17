"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@/i18n/navigation";
import { ArticleEditorCK, type ArticleEditorCKHandle } from "./article-editor-ck";
import { ArticleSeoPanel } from "./article-seo-panel";
import { ArticleContentAnalyzer } from "./article-content-analyzer";
import { updateAiArticle } from "@/app/[locale]/admin/articles/actions";

type Props = {
  id: string;
  keyword: string;
  locale: string;
  status: string;
  defaultTitle: string;
  defaultSummary: string;
  defaultMetaDescription: string;
  defaultBody: string;
  cancelHref: string;
};

export function ArticleEditForm({
  id,
  keyword,
  locale,
  status,
  defaultTitle,
  defaultSummary,
  defaultMetaDescription,
  defaultBody,
  cancelHref,
}: Props) {
  const [title, setTitle] = useState(defaultTitle);
  const [summary, setSummary] = useState(defaultSummary);
  const [metaDescription, setMetaDescription] = useState(defaultMetaDescription);
  const [body, setBody] = useState(defaultBody);
  const editorRef = useRef<ArticleEditorCKHandle>(null);

  const [state, formAction, pending] = useActionState(updateAiArticle, null);

  useEffect(() => {
    if (state && "error" in state) {
      toast.error(state.error);
    }
  }, [state]);

  const seoFields = { keyword, title, summary, metaDescription, body };

  function applyFix(field: "title" | "summary" | "metaDescription", value: string) {
    if (field === "title") setTitle(value);
    else if (field === "summary") setSummary(value);
    else if (field === "metaDescription") setMetaDescription(value);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      {/* Left: editor */}
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Nội dung bài viết</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-5">
            <input type="hidden" name="id" value={id} />

            {state && "error" in state && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                <AlertCircle className="size-3.5 shrink-0" />
                {state.error}
              </div>
            )}

            <div>
              <Label htmlFor="title">
                Tiêu đề{" "}
                <span
                  className={
                    title.length < 40 || title.length > 70
                      ? "text-amber-400"
                      : "text-muted-foreground"
                  }
                >
                  ({title.length}/70)
                </span>
              </Label>
              <Input
                id="title"
                name="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={140}
                className="mt-1.5"
                required
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Tối ưu: 50–70 ký tự, chứa keyword chính.
              </p>
            </div>

            <div>
              <Label htmlFor="summary">Tóm tắt</Label>
              <Textarea
                id="summary"
                name="summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                maxLength={280}
                rows={3}
                className="mt-1.5"
                required
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Mô tả ngắn gọn, cụ thể về bối cảnh thị trường hiện tại.
              </p>
            </div>

            <div>
              <Label htmlFor="metaDescription">
                Meta Description{" "}
                <span
                  className={
                    metaDescription.length < 140 || metaDescription.length > 165
                      ? "text-amber-400"
                      : "text-muted-foreground"
                  }
                >
                  ({metaDescription.length}/165)
                </span>
              </Label>
              <Textarea
                id="metaDescription"
                name="metaDescription"
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                maxLength={180}
                rows={2}
                className="mt-1.5"
                required
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Tối ưu: 140–165 ký tự, chứa keyword, có call-to-action.
              </p>
            </div>

            <div>
              <Label className="mb-1.5 block">
                Nội dung{" "}
                <span className="font-normal text-muted-foreground">
                  ({body.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length} từ)
                </span>
              </Label>
              <ArticleEditorCK
                ref={editorRef}
                name="body"
                defaultValue={defaultBody}
                onValueChange={setBody}
                required
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Tối ưu: 5+ mục H2, 600+ từ, có disclaimer rủi ro cuối bài.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={pending} className="gap-2">
                {pending && <Loader2 className="size-3.5 animate-spin" />}
                {pending ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
              <Link
                href={cancelHref}
                className="inline-flex h-9 items-center rounded-md border border-input px-4 text-sm hover:bg-accent"
              >
                Hủy
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Right: SEO panel */}
      <aside className="space-y-3">
        <div className="sticky top-4">
          <Card className="border-border/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">SEO Check</CardTitle>
              <p className="text-xs text-muted-foreground">
                Keyword: <span className="font-mono">{keyword}</span> ·{" "}
                {locale.toUpperCase()} · {status}
              </p>
            </CardHeader>
            <CardContent>
              <ArticleSeoPanel fields={seoFields} onApplyFix={applyFix} />
            </CardContent>
          </Card>

          <Card className="border-border/70 mt-3">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">AI Content Review</CardTitle>
              <p className="text-xs text-muted-foreground">
                Phân tích nội dung và gợi ý cải thiện
              </p>
            </CardHeader>
            <CardContent>
              <ArticleContentAnalyzer
                keyword={keyword}
                title={title}
                locale={locale}
                getBody={() => body}
                editorRef={editorRef}
              />
            </CardContent>
          </Card>
        </div>
      </aside>
    </div>
  );
}
