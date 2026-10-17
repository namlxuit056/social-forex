import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Bot, FileText, Play, Plus, Settings, TrendingUp } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fetchCurrentTrendingKeywords } from "@/lib/ai/article-writer";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  archiveAiArticle,
  generateArticleForKeyword,
  publishAiArticle,
  runAiArticleAutomationNow,
  updateAiArticleAutomation,
} from "./actions";
import { DeleteArticleButton } from "./delete-button";
import { SubmitButton } from "./submit-button";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  return { title: t("aiArticles") };
}

function formatDate(value: Date | null, locale: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function AdminAiArticlesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");

  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const admin = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (admin?.role !== "ADMIN") {
    return (
      <div className="space-y-4">
        <h1 className="font-heading text-xl font-semibold">{t("noAccess")}</h1>
        <p className="text-muted-foreground">{t("noAccessHint")}</p>
      </div>
    );
  }

  const [setting, articles] = await Promise.all([
    prisma.aiArticleAutomationSetting.upsert({
      where: { id: "default" },
      create: {},
      update: {},
    }),
    prisma.aiGeneratedArticle.findMany({
      orderBy: { generatedAt: "desc" },
      take: 50,
    }),
  ]);

  const settingLocale = setting.locale === "en" ? "en" : "vi";
  const trendingData = await fetchCurrentTrendingKeywords(
    setting.seedKeywords,
    settingLocale,
  );

  const stats = {
    total: articles.length,
    draft: articles.filter((a) => a.status === "DRAFT").length,
    published: articles.filter((a) => a.status === "PUBLISHED").length,
    archived: articles.filter((a) => a.status === "ARCHIVED").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-xl font-semibold text-foreground">
          <Bot className="mr-2 inline-block size-5" aria-hidden />
          {t("aiArticles")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("aiArticlesDesc")}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          [
            ["aiArticlesStatTotal", stats.total],
            ["aiArticlesStatDraft", stats.draft],
            ["aiArticlesStatPublished", stats.published],
            ["aiArticlesStatArchived", stats.archived],
          ] as const
        ).map(([key, count]) => (
          <div
            key={key}
            className="rounded-lg border border-border/60 bg-card/40 p-3 text-center"
          >
            <div className="text-2xl font-bold text-foreground">{count}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{t(key)}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.42fr_0.58fr]">
        {/* Left column: settings + generate */}
        <div className="space-y-4">
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings className="size-4 text-primary" aria-hidden />
                {t("aiArticlesSettings")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form action={updateAiArticleAutomation} className="space-y-4">
                <label className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/15 p-3 text-sm">
                  <input
                    type="checkbox"
                    name="enabled"
                    defaultChecked={setting.enabled}
                    className="mt-1 size-4 accent-primary"
                  />
                  <span>
                    <span className="block font-medium text-foreground">
                      {t("aiArticlesEnable")}
                    </span>
                    <span className="text-muted-foreground">
                      {t("aiArticlesEnableHint")}
                    </span>
                  </span>
                </label>

                <label className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
                  <input
                    type="checkbox"
                    name="autoPublish"
                    defaultChecked={setting.autoPublish}
                    className="mt-1 size-4 accent-primary"
                  />
                  <span>
                    <span className="block font-medium text-foreground">
                      {t("aiArticlesAutoPublish")}
                    </span>
                    <span className="text-muted-foreground">
                      {t("aiArticlesAutoPublishHint")}
                    </span>
                  </span>
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="locale">{t("aiArticlesLocale")}</Label>
                    <select
                      id="locale"
                      name="locale"
                      defaultValue={setting.locale}
                      className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                    >
                      <option value="vi">VI</option>
                      <option value="en">EN</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="maxArticlesPerDay">
                      {t("aiArticlesDailyLimit")}
                    </Label>
                    <Input
                      id="maxArticlesPerDay"
                      name="maxArticlesPerDay"
                      type="number"
                      min="1"
                      max="5"
                      defaultValue={setting.maxArticlesPerDay}
                      className="mt-1.5"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="seedKeywords">{t("aiArticlesSeedKeywords")}</Label>
                  <Textarea
                    id="seedKeywords"
                    name="seedKeywords"
                    rows={5}
                    defaultValue={setting.seedKeywords.join("\n")}
                    className="mt-1.5 font-mono text-xs"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <SubmitButton pendingLabel="Đang lưu cấu hình...">
                    {t("saveSettings")}
                  </SubmitButton>
                </div>
              </form>

              <form action={runAiArticleAutomationNow} className="mt-3">
                <SubmitButton
                  variant="outline"
                  pendingLabel="Đang chạy AI..."
                >
                  <Play className="mr-2 size-4" aria-hidden />
                  {t("aiArticlesRunNow")}
                </SubmitButton>
              </form>

              <p className="mt-3 text-xs text-muted-foreground">
                {t("aiArticlesLastRun", {
                  date: formatDate(setting.lastRunAt, locale),
                })}
              </p>
            </CardContent>
          </Card>

          {/* Trending keywords preview */}
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="size-4 text-primary" aria-hidden />
                {t("aiArticlesTrending")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {trendingData.googleTrends.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                    {t("aiArticlesGoogleTrends")}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {trendingData.googleTrends.map((kw) => (
                      <Badge key={kw} variant="secondary" className="text-xs">
                        {kw}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                  {t("aiArticlesCombinedKeywords")}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {trendingData.keywords.map((kw) => (
                    <Badge key={kw} variant="outline" className="text-xs">
                      {kw}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Manual keyword generation */}
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Plus className="size-4 text-primary" aria-hidden />
                {t("aiArticlesGenerateManual")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form action={generateArticleForKeyword} className="space-y-3">
                <div>
                  <Label htmlFor="keyword">{t("aiArticlesKeyword")}</Label>
                  <Input
                    id="keyword"
                    name="keyword"
                    placeholder="XAUUSD, EUR/USD, gold price..."
                    className="mt-1.5"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="gen-locale">{t("aiArticlesLocale")}</Label>
                    <select
                      id="gen-locale"
                      name="locale"
                      defaultValue={setting.locale}
                      className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                    >
                      <option value="vi">VI</option>
                      <option value="en">EN</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="gen-status">{t("aiArticlesStatus")}</Label>
                    <select
                      id="gen-status"
                      name="status"
                      defaultValue="DRAFT"
                      className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="PUBLISHED">Published</option>
                    </select>
                  </div>
                </div>
                <SubmitButton className="w-full" pendingLabel="Đang viết bài...">
                  <Bot className="mr-2 size-4" aria-hidden />
                  {t("aiArticlesGenerateNow")}
                </SubmitButton>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right column: article list */}
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="size-4 text-primary" aria-hidden />
              {t("aiArticlesRecent")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {articles.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("aiArticlesEmpty")}
              </p>
            ) : (
              articles.map((article) => (
                <article
                  key={article.id}
                  className="rounded-lg border border-border/60 bg-card/45 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        article.status === "PUBLISHED"
                          ? "default"
                          : article.status === "ARCHIVED"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {article.status}
                    </Badge>
                    <Badge variant="secondary">{article.keyword}</Badge>
                    <Badge variant="outline" className="text-xs">
                      {article.locale.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(article.generatedAt, locale)}
                    </span>
                  </div>
                  <h2 className="mt-2 text-sm font-semibold text-foreground">
                    {article.title}
                  </h2>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {article.summary}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {article.status !== "PUBLISHED" && (
                      <form action={publishAiArticle}>
                        <input type="hidden" name="id" value={article.id} />
                        <SubmitButton size="sm" pendingLabel="Đang publish...">
                          {t("publish")}
                        </SubmitButton>
                      </form>
                    )}
                    {article.status === "PUBLISHED" && (
                      <Link
                        href={`/articles/${article.slug}`}
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                        )}
                      >
                        {t("view")}
                      </Link>
                    )}
                    <Link
                      href={`/admin/articles/${article.id}`}
                      className={cn(
                        buttonVariants({ variant: "ghost", size: "sm" }),
                      )}
                    >
                      {t("edit")}
                    </Link>
                    {article.status !== "ARCHIVED" && (
                      <form action={archiveAiArticle}>
                        <input type="hidden" name="id" value={article.id} />
                        <SubmitButton
                          size="sm"
                          variant="ghost"
                          pendingLabel="Đang ẩn..."
                        >
                          {t("archive")}
                        </SubmitButton>
                      </form>
                    )}
                    <DeleteArticleButton
                      id={article.id}
                      confirmText={t("aiArticlesDeleteConfirm")}
                      label={t("delete")}
                    />
                  </div>
                </article>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
