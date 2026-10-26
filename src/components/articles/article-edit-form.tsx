"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Link, useRouter } from "@/i18n/navigation";
import { ArticleEditorCK, type ArticleEditorCKHandle } from "./article-editor-ck";
import { ArticleSeoPanel } from "./article-seo-panel";
import { ArticleContentAnalyzer } from "./article-content-analyzer";
import { ArticleThumbnailField } from "./article-thumbnail-field";
import {
  createManualArticle,
  updateAiArticle,
  type CreateArticleState,
  type UpdateArticleState,
} from "@/app/[locale]/admin/articles/actions";

type Props = {
  /** Omitted = create mode: keyword/locale become editable and the form saves a new article. */
  id?: string;
  keyword: string;
  locale: string;
  status: string;
  defaultTitle: string;
  defaultSummary: string;
  defaultMetaDescription: string;
  defaultBody: string;
  defaultImageUrl?: string | null;
  defaultImageAlt?: string | null;
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
  defaultImageUrl,
  defaultImageAlt,
  cancelHref,
}: Props) {
  const [title, setTitle] = useState(defaultTitle);
  const [summary, setSummary] = useState(defaultSummary);
  const [metaDescription, setMetaDescription] = useState(defaultMetaDescription);
  const [body, setBody] = useState(defaultBody);
  const [articleKeyword, setArticleKeyword] = useState(keyword);
  const [articleLocale, setArticleLocale] = useState(locale);
  const editorRef = useRef<ArticleEditorCKHandle>(null);
  const router = useRouter();
  const isCreate = !id;

  const [state, formAction, pending] = useActionState<
    UpdateArticleState | CreateArticleState,
    FormData
  >(
    (prev, formData) =>
      id
        ? updateAiArticle(prev as UpdateArticleState, formData)
        : createManualArticle(prev as CreateArticleState, formData),
    null,
  );

  useEffect(() => {
    if (state && "error" in state) {
      toast.error(state.error);
    } else if (state && "id" in state) {
      toast.success("Đã tạo bài viết.");
      router.push(`/admin/articles/${state.id}`);
    } else if (state?.ok) {
      toast.success("Đã lưu thay đổi.");
    }
  }, [state, router]);

  const seoFields = { keyword: articleKeyword, title, summary, metaDescription, body };

  function applyFix(field: "title" | "summary" | "metaDescription", value: string) {
    if (field === "title") setTitle(value);
    else if (field === "summary") setSummary(value);
    else if (field === "metaDescription") setMetaDescription(value);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      {/* Left: editor */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base">Nội dung bài viết</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-5">
            {id ? <input type="hidden" name="id" value={id} /> : null}

            {state && "error" in state && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                <AlertCircle className="size-3.5 shrink-0" />
                {state.error}
              </div>
            )}

            {isCreate ? (
              <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
                <div>
                  <Label htmlFor="keyword">Keyword chính</Label>
                  <Input
                    id="keyword"
                    name="keyword"
                    value={articleKeyword}
                    onChange={(e) => setArticleKeyword(e.target.value)}
                    placeholder="XAUUSD, EUR/USD, quản lý vốn..."
                    maxLength={100}
                    className="mt-1.5"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="article-locale">Ngôn ngữ</Label>
                  <select
                    id="article-locale"
                    name="locale"
                    value={articleLocale}
                    onChange={(e) => setArticleLocale(e.target.value)}
                    className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  >
                    <option value="vi">VI</option>
                    <option value="en">EN</option>
                  </select>
                </div>
              </div>
            ) : null}

            <ArticleThumbnailField
              defaultImageUrl={defaultImageUrl}
              defaultImageAlt={defaultImageAlt}
            />

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
              {/* Controlled hidden input — always reflects current body state */}
              <input type="hidden" name="body" value={body} onChange={() => {}} />
              <ArticleEditorCK
                ref={editorRef}
                defaultValue={defaultBody}
                onValueChange={setBody}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Tối ưu: 5+ mục H2, 600+ từ, có disclaimer rủi ro cuối bài.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              {isCreate ? (
                <>
                  <Button type="submit" name="status" value="PUBLISHED" disabled={pending} className="gap-2">
                    {pending && <Loader2 className="size-3.5 animate-spin" />}
                    Đăng bài
                  </Button>
                  <Button type="submit" name="status" value="DRAFT" variant="outline" disabled={pending}>
                    Lưu nháp
                  </Button>
                </>
              ) : (
                <Button type="submit" disabled={pending} className="gap-2">
                  {pending && <Loader2 className="size-3.5 animate-spin" />}
                  {pending ? "Đang lưu..." : "Lưu thay đổi"}
                </Button>
              )}
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
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">SEO Check</CardTitle>
              <p className="text-xs text-muted-foreground">
                Keyword: <span className="font-mono">{articleKeyword || "—"}</span> ·{" "}
                {articleLocale.toUpperCase()} · {status}
              </p>
            </CardHeader>
            <CardContent>
              <ArticleSeoPanel fields={seoFields} locale={articleLocale} onApplyFix={applyFix} />
            </CardContent>
          </Card>

          <Card className="border-border mt-3">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">AI Content Review</CardTitle>
              <p className="text-xs text-muted-foreground">
                Phân tích nội dung và gợi ý cải thiện
              </p>
            </CardHeader>
            <CardContent>
              <ArticleContentAnalyzer
                keyword={articleKeyword}
                title={title}
                locale={articleLocale}
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
